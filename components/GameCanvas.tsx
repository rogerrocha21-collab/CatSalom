import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, Enemy, Point, SpellType, Particle, BiomeType, Language } from '../types';
import { recognizeGesture, getSymbolIcon, getSymbolColor } from '../utils/gesture';
import { BIOME_CONFIG, BIOME_ORDER, getTargetScore } from '../utils/gameConfig';
import { Cat, Heart, Shield, Hourglass, Bomb, Pause, Play, Lock } from 'lucide-react';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  catName: string;
  language: Language;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, score, setScore, catName, language }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // -- Progression State --
  const [currentBiomeIndex, setCurrentBiomeIndex] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalLevelsCleared, setTotalLevelsCleared] = useState(0); 
  
  // -- Mutable Game State --
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const drawingPointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const frameIdRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // -- Skills State --
  const skillsRef = useRef({
      shieldActive: false,
      shieldEndTime: 0,
      timeSlowActive: false,
      timeSlowEndTime: 0,
      timeScale: 1.0,
  });
  const [cooldowns, setCooldowns] = useState({
      shield: { end: 0, total: 15000 },
      hourglass: { end: 0, total: 20000 },
      bomb: { end: 0, total: 25000 }
  });
  
  const [health, setHealth] = useState(5);
  const maxHealth = 5;

  // -- Derived Data --
  const currentBiome: BiomeType = BIOME_ORDER[currentBiomeIndex];
  const biomeData = BIOME_CONFIG[currentBiome];
  const isBossLevel = currentLevel === 11;
  
  // Strict Progression Target
  const targetScore = getTargetScore(currentBiome, currentLevel);

  // Translation Map
  const t = {
      pt: {
          level: 'Fase',
          bossBattle: 'BATALHA DE CHEFE',
          paused: 'PAUSADO',
          bossDefeated: 'Boss Derrotado',
          levelComplete: 'Fase Completa',
          levelScore: 'Pontos da Fase',
          nextLevel: 'Próxima Fase'
      },
      en: {
          level: 'Level',
          bossBattle: 'BOSS BATTLE',
          paused: 'PAUSED',
          bossDefeated: 'Boss Defeated',
          levelComplete: 'Level Complete',
          levelScore: 'Level Score',
          nextLevel: 'Next Level'
      }
  }[language];

  // -- Boss State --
  const bossRef = useRef({
      active: false,
      maxSigils: 0,
      currentSigils: 0,
      nextAttackTime: 0
  });

  // --------------------------------------------------------------------------
  // GAME LOGIC HELPERS
  // --------------------------------------------------------------------------

  const spawnEnemy = (timestamp: number, width: number, height: number) => {
    if (skillsRef.current.timeSlowActive && skillsRef.current.timeScale < 0.1) return;

    const id = Math.random().toString(36).substr(2, 9);
    const side = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
    let x = 0, y = 0;
    const padding = 60;

    switch(side) {
        case 0: x = Math.random() * width; y = -padding; break;
        case 1: x = width + padding; y = Math.random() * height; break;
        case 2: x = Math.random() * width; y = height + padding; break;
        case 3: x = -padding; y = Math.random() * height; break;
    }

    // Difficulty Scaling based on Biome and Level
    // Biome multiplier effectively speeds up game per area
    const difficultyMultiplier = 1 + (currentBiomeIndex * 0.25) + (currentLevel * 0.1);
    
    // Base speed: Boss levels are faster/chaotic
    const speedBase = isBossLevel ? 2.5 : 0.8;
    
    // Spell Selection logic - PROGRESSION
    const spellTypes = [SpellType.HORIZONTAL, SpellType.VERTICAL];
    
    // Level 2+: Add C (Simple Curve)
    if (currentLevel > 1 || currentBiomeIndex > 0) spellTypes.push(SpellType.C_SHAPE);
    
    // Level 3+: Add 7 (was T)
    if (currentLevel > 2 || currentBiomeIndex > 0) spellTypes.push(SpellType.SEVEN_SHAPE);
    
    // Level 5+: Add 8 (was N)
    if (currentLevel > 4 || currentBiomeIndex > 0) spellTypes.push(SpellType.EIGHT_SHAPE);
    
    // Level 7+: Add S (Complex Curve)
    if (currentLevel > 6 || currentBiomeIndex > 0) spellTypes.push(SpellType.S_SHAPE);
    
    // Level 9+: Add X (Intersection)
    if (currentLevel > 8 || currentBiomeIndex > 1) spellTypes.push(SpellType.X_SHAPE);
    
    // Lightning only in later areas or high levels
    if (currentLevel > 8 && currentBiomeIndex > 0 && Math.random() > 0.8) spellTypes.push(SpellType.LIGHTNING);

    const symbol = spellTypes[Math.floor(Math.random() * spellTypes.length)];

    const newEnemy: Enemy = {
        id,
        x,
        y,
        speed: (speedBase + (Math.random() * difficultyMultiplier)) * 0.7,
        symbol,
        color: getSymbolColor(symbol),
        radius: 22,
        spawnTime: timestamp,
        isProjectile: isBossLevel
    };

    enemiesRef.current.push(newEnemy);
  };

  const spawnBossSigils = (width: number, height: number) => {
      enemiesRef.current = [];
      
      const sigilCount = 4 + currentBiomeIndex;
      bossRef.current.maxSigils = sigilCount;
      bossRef.current.currentSigils = sigilCount;
      bossRef.current.active = true;

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = 130;

      // Boss uses a mix of complex symbols
      const bossSpells = [
          SpellType.C_SHAPE, 
          SpellType.SEVEN_SHAPE, 
          SpellType.EIGHT_SHAPE, 
          SpellType.S_SHAPE, 
          SpellType.X_SHAPE, 
          SpellType.LIGHTNING
      ];

      for (let i = 0; i < sigilCount; i++) {
          const angle = (i / sigilCount) * Math.PI * 2;
          const symbol = bossSpells[i % bossSpells.length];

          enemiesRef.current.push({
              id: `boss-sigil-${i}`,
              x: centerX + Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius,
              speed: 0,
              symbol,
              color: '#ef4444', 
              radius: 35,
              spawnTime: 0,
              isBossSigil: true
          });
      }
  };

  const activateSkill = (skill: 'shield' | 'hourglass' | 'bomb') => {
      const now = Date.now();
      
      if (skill === 'shield') {
          skillsRef.current.shieldActive = true;
          skillsRef.current.shieldEndTime = now + 4000;
          setCooldowns(prev => ({...prev, shield: { end: now + 15000, total: 15000 }}));
      }
      else if (skill === 'hourglass') {
          skillsRef.current.timeSlowActive = true;
          skillsRef.current.timeScale = 0.1;
          skillsRef.current.timeSlowEndTime = now + 4000;
          setCooldowns(prev => ({...prev, hourglass: { end: now + 20000, total: 20000 }}));
      }
      else if (skill === 'bomb') {
          createParticles(window.innerWidth/2, window.innerHeight/2, '#FFFFFF', 50, true);
          
          enemiesRef.current = enemiesRef.current.filter(e => {
              if (e.isBossSigil) return true;
              return false;
          });
          setCooldowns(prev => ({...prev, bomb: { end: now + 25000, total: 25000 }}));
      }
  };

  // --------------------------------------------------------------------------
  // GAME LOOP
  // --------------------------------------------------------------------------

  const checkGesture = () => {
    const points = drawingPointsRef.current;
    if (points.length < 2) return;

    const gesture = recognizeGesture(points);
    const lastPoint = points[points.length - 1];

    if (!gesture) {
        createParticles(lastPoint.x, lastPoint.y, '#555555', 5);
        return;
    }

    const targets = enemiesRef.current.filter(e => e.symbol === gesture);

    if (targets.length > 0) {
        let scoreToAdd = 0;
        let bossSigilsDestroyed = 0;

        targets.forEach(target => {
            createParticles(target.x, target.y, target.color, 20, true);
            
            if (target.isBossSigil) {
                bossSigilsDestroyed++;
            } else {
                // Score calculation: 10 base * Area Multiplier
                // Note: This score adds to the LEVEL total.
                // We use biome index as a rough multiplier for individual kills too.
                scoreToAdd += isBossLevel ? 0 : 10 * (1 + currentBiomeIndex * 0.5);
            }
        });

        const targetIds = new Set(targets.map(t => t.id));
        enemiesRef.current = enemiesRef.current.filter(e => !targetIds.has(e.id));

        if (scoreToAdd > 0) {
            setScore(prev => prev + Math.ceil(scoreToAdd));
        }

        if (bossSigilsDestroyed > 0) {
            bossRef.current.currentSigils -= bossSigilsDestroyed;
            if (bossRef.current.currentSigils <= 0) {
                // Boss Defeated!
                // Add a big bonus just for satisfaction, but progress is triggered by sigils=0
                setScore(prev => prev + 1000);
                handleLevelComplete();
            }
        }
    } else {
        createParticles(lastPoint.x, lastPoint.y, '#ef4444', 8); 
    }
  };

  const handleLevelComplete = useCallback(() => {
      // Logic to advance level/biome
      if (currentLevel === 11) {
          // Boss Defeated, move to next biome
          if (currentBiomeIndex < BIOME_ORDER.length - 1) {
              setCurrentBiomeIndex(prev => prev + 1);
              setCurrentLevel(1);
          } else {
              // Loop back to start (New Game+ style) or End Game?
              // For now loop back to garden but harder (level 1)
              setCurrentBiomeIndex(0);
              setCurrentLevel(1); 
          }
      } else {
          // Normal level complete
          setCurrentLevel(prev => prev + 1);
      }
      
      setTotalLevelsCleared(prev => prev + 1);
      setGameState(GameState.LEVEL_COMPLETE);
      // NOTE: We do NOT reset score here. We reset it when re-entering PLAYING state.
      // This allows the Level Complete screen to show the score achieved.
  }, [currentLevel, currentBiomeIndex, setGameState]);

  const createParticles = (x: number, y: number, color: string, count: number = 10, glow: boolean = false) => {
    for (let i = 0; i < count; i++) {
        particlesRef.current.push({
            id: Math.random().toString(),
            x,
            y,
            vx: (Math.random() - 0.5) * 15, 
            vy: (Math.random() - 0.5) * 15,
            life: 1.0,
            color,
            size: Math.random() * 4 + 2,
            glow
        });
    }
  };

  const gameLoop = useCallback((timestamp: number) => {
    if (isPaused) {
        lastSpawnTimeRef.current = timestamp;
        return; 
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const now = Date.now();
    if (skillsRef.current.shieldActive && now > skillsRef.current.shieldEndTime) {
        skillsRef.current.shieldActive = false;
    }
    if (skillsRef.current.timeSlowActive && now > skillsRef.current.timeSlowEndTime) {
        skillsRef.current.timeSlowActive = false;
        skillsRef.current.timeScale = 1.0;
    }
    const dt = skillsRef.current.timeScale;

    // -- Check Level Progression --
    // Only check score for levels 1-10. Level 11 is boss mechanics only.
    if (!isBossLevel && score >= targetScore) {
        handleLevelComplete();
        return;
    }

    // -- Render Background --
    ctx.fillStyle = biomeData.bg;
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // -- Boss Spawning / Logic --
    if (isBossLevel) {
        if (!bossRef.current.active) {
            spawnBossSigils(width, height);
        }
        
        const rotationSpeed = 0.002 * dt;
        enemiesRef.current.forEach(e => {
            if (e.isBossSigil) {
                const dx = e.x - centerX;
                const dy = e.y - centerY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const angle = Math.atan2(dy, dx) + rotationSpeed;
                e.x = centerX + Math.cos(angle) * dist;
                e.y = centerY + Math.sin(angle) * dist;
            }
        });

        if (timestamp - lastSpawnTimeRef.current > (1500 / (1 + currentBiomeIndex * 0.2))) {
             spawnEnemy(timestamp, width, height); 
             lastSpawnTimeRef.current = timestamp;
        }
    } else {
        // Normal Spawning - Use Biome Index to increase spawn rate
        const spawnRate = 1800 / (1 + (currentLevel * 0.1) + (currentBiomeIndex * 0.3));
        if (timestamp - lastSpawnTimeRef.current > spawnRate) {
            spawnEnemy(timestamp, width, height);
            lastSpawnTimeRef.current = timestamp;
        }
    }

    // -- Move Enemies --
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const enemy = enemiesRef.current[i];
        
        if (!enemy.isBossSigil) {
            const dx = centerX - enemy.x;
            const dy = centerY - enemy.y;
            const angle = Math.atan2(dy, dx);
            
            enemy.x += Math.cos(angle) * enemy.speed * dt;
            enemy.y += Math.sin(angle) * enemy.speed * dt;

            const dist = Math.hypot(dx, dy);
            if (dist < 45) { 
                enemiesRef.current.splice(i, 1);
                
                if (!skillsRef.current.shieldActive) {
                    setHealth(prev => {
                        const newHealth = prev - 1;
                        if (newHealth <= 0) setGameState(GameState.GAME_OVER);
                        createParticles(centerX, centerY, '#ef4444', 30, true);
                        return newHealth;
                    });
                } else {
                    createParticles(centerX, centerY, '#60a5fa', 15, true);
                }
            }
        }
    }

    // -- Render Entities --

    if (isBossLevel) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(timestamp / 2000);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const bossSize = 100 + Math.sin(timestamp / 500) * 10;
        ctx.rect(-bossSize/2, -bossSize/2, bossSize, bossSize);
        ctx.stroke();
        ctx.restore();
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    if (skillsRef.current.shieldActive) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    enemiesRef.current.forEach(enemy => {
        ctx.strokeStyle = enemy.isBossSigil ? '#f87171' : '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = enemy.isBossSigil ? '#f87171' : enemy.color;
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 5;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getSymbolIcon(enemy.symbol), enemy.x, enemy.y);
        ctx.shadowBlur = 0;
    });

    particlesRef.current.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= 0.02;
        if (p.life <= 0) return;

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        if (p.glow) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        const radius = Math.max(0, p.size * p.life);
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); 
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    if (drawingPointsRef.current.length > 0) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.moveTo(drawingPointsRef.current[0].x, drawingPointsRef.current[0].y);
        for (let i = 1; i < drawingPointsRef.current.length; i++) {
            ctx.lineTo(drawingPointsRef.current[i].x, drawingPointsRef.current[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

  }, [gameState, score, targetScore, isBossLevel, currentBiomeIndex, currentLevel, handleLevelComplete, biomeData, isPaused, t]);

  // -- Event Listeners & Setup --
  
  // 1. Initialization Effect
  // IMPORTANT: Resets game data when entering PLAYING state
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        enemiesRef.current = [];
        particlesRef.current = [];
        bossRef.current.active = false;
        setIsPaused(false);
        setHealth(maxHealth); 
        // FIX: Reset score on every level start to allow progression check to work correctly
        setScore(0);
        lastSpawnTimeRef.current = performance.now();
    }
  }, [gameState, setScore]);

  // 2. Loop Management Effect
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    let id: number;
    const loop = (time: number) => {
        gameLoop(time);
        id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(id);
  }, [gameState, gameLoop]);

  const handleInputStart = (x: number, y: number) => {
      if (gameState !== GameState.PLAYING || isPaused) return;
      isDrawingRef.current = true;
      drawingPointsRef.current = [{x, y}];
  };
  const handleInputMove = (x: number, y: number) => {
      if (!isDrawingRef.current || gameState !== GameState.PLAYING || isPaused) return;
      const last = drawingPointsRef.current[drawingPointsRef.current.length-1];
      if (Math.hypot(x - last.x, y - last.y) > 5) {
          drawingPointsRef.current.push({x, y});
      }
  };
  const handleInputEnd = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      checkGesture();
      drawingPointsRef.current = [];
  };

  return (
    <div 
        ref={containerRef}
        className="relative w-full h-full overflow-hidden select-none touch-none"
        onTouchStart={e => handleInputStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => handleInputMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleInputEnd}
        onMouseDown={e => handleInputStart(e.clientX, e.clientY)}
        onMouseMove={e => handleInputMove(e.clientX, e.clientY)}
        onMouseUp={handleInputEnd}
        onMouseLeave={handleInputEnd}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* --- HUD --- */}
      {gameState === GameState.PLAYING && (
          <>
            {/* Top Bar */}
            <div className="absolute top-4 left-0 w-full flex justify-between px-6 items-center pointer-events-none">
                <div className="text-xs uppercase tracking-widest text-white/50">
                    {biomeData.name[language]} <span className="text-white">| {currentLevel === 11 ? 'BOSS' : `${t.level} ${currentLevel}`}</span>
                </div>
                
                {/* Score & Pause Button Area */}
                <div className="flex items-center gap-4">
                    {!isBossLevel && (
                        <div className="flex flex-col items-end pointer-events-none">
                             <span className="text-2xl font-thin font-serif">{score} <span className="text-sm text-white/40">/ {targetScore}</span></span>
                             <div className="w-24 h-1 bg-white/10 mt-1">
                                 <div className="h-full bg-white transition-all duration-300" style={{ width: `${Math.min(100, (score/targetScore)*100)}%` }}></div>
                             </div>
                        </div>
                    )}
                    {isBossLevel && (
                         <div className="text-red-500 font-bold tracking-widest animate-pulse pointer-events-none">{t.bossBattle}</div>
                    )}
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
                        className="pointer-events-auto p-2 hover:bg-white/10 rounded-full transition-colors z-50"
                    >
                        {isPaused ? <Play size={24} fill="white" /> : <Pause size={24} fill="white" />}
                    </button>
                </div>
            </div>

            {/* Health */}
            <div className="absolute top-16 left-0 w-full flex justify-center gap-2 pointer-events-none">
                {[...Array(maxHealth)].map((_, i) => (
                    <Heart 
                        key={i} 
                        size={24} 
                        strokeWidth={1}
                        className={`${i < health ? 'fill-white text-white' : 'text-white/20'}`} 
                    />
                ))}
            </div>
            
            {/* Pause Overlay */}
            {isPaused && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-none">
                    <span className="text-4xl font-thin tracking-[0.5em] text-white animate-pulse">{t.paused}</span>
                </div>
            )}

            {/* Skills Bar */}
            <div className="absolute bottom-8 w-full flex justify-center gap-6 pointer-events-auto z-30">
                <SkillButton 
                    icon={<Shield size={20} />} 
                    isUnlocked={totalLevelsCleared >= 5}
                    cooldownInfo={cooldowns.shield}
                    onClick={() => activateSkill('shield')}
                />
                <SkillButton 
                    icon={<Hourglass size={20} />} 
                    isUnlocked={totalLevelsCleared >= 10}
                    cooldownInfo={cooldowns.hourglass}
                    onClick={() => activateSkill('hourglass')}
                />
                <SkillButton 
                    icon={<Bomb size={20} />} 
                    isUnlocked={totalLevelsCleared >= 15}
                    cooldownInfo={cooldowns.bomb}
                    onClick={() => activateSkill('bomb')}
                />
            </div>
            
            {/* Center Character Anchor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-80">
                <Cat size={48} strokeWidth={1} className="text-white" />
            </div>
          </>
      )}

      {/* Level Complete Overlay */}
      {gameState === GameState.LEVEL_COMPLETE && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center animate-fade-in z-50">
              <h2 className="text-3xl font-thin text-white mb-4 tracking-widest uppercase">
                  {currentLevel === 11 ? t.bossDefeated : t.levelComplete}
              </h2>
              <div className="text-white/60 mb-8">{t.levelScore}: {score}</div>
              <button 
                onClick={() => setGameState(GameState.PLAYING)}
                className="px-8 py-3 border border-white text-white hover:bg-white hover:text-black transition-all uppercase tracking-widest text-sm"
              >
                  {t.nextLevel}
              </button>
          </div>
      )}
    </div>
  );
};

// Sub-component for Skills with Visual Circular Cooldown
const SkillButton: React.FC<{
    icon: React.ReactNode; 
    isUnlocked: boolean; 
    cooldownInfo: { end: number, total: number };
    onClick: () => void;
}> = ({ icon, isUnlocked, cooldownInfo, onClick }) => {
    const [progress, setProgress] = useState(0); // 0 to 1

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            if (now >= cooldownInfo.end) {
                setProgress(0);
            } else {
                const remaining = cooldownInfo.end - now;
                setProgress(remaining / cooldownInfo.total);
            }
        }, 50);
        return () => clearInterval(interval);
    }, [cooldownInfo]);

    if (!isUnlocked) {
        return (
            <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center opacity-30">
                <Lock size={16} strokeWidth={1.5} />
            </div>
        );
    }

    const isOnCooldown = progress > 0;
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <button 
            disabled={isOnCooldown}
            onClick={onClick}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all relative
                ${isOnCooldown ? 'text-white/30 cursor-not-allowed' : 'text-white hover:scale-105 active:scale-95 bg-white/5'}
            `}
        >
            {/* Circular Progress SVG */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 56 56">
                <circle 
                    cx="28" cy="28" r={radius} 
                    fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" 
                />
                {isOnCooldown && (
                    <circle 
                        cx="28" cy="28" r={radius} 
                        fill="none" stroke="white" strokeWidth="2" 
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-75"
                    />
                )}
            </svg>
            
            {/* Icon */}
            <div className="relative z-10">{icon}</div>
        </button>
    );
}

export default GameCanvas;