import React, { useState } from 'react';
import { Cat, PlayCircle, MessageCircle, BookOpen, X, MousePointer2, Skull, Zap, Shield, Hourglass, Bomb } from 'lucide-react';
import { Language } from '../types';

interface MenuProps {
  onStart: (catName: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Menu: React.FC<MenuProps> = ({ onStart, language, setLanguage }) => {
  const [name, setName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const t = {
    pt: {
      grimoire: "Grimório",
      magicGestures: "Gestos Mágicos",
      gesturesDesc: "Desenhe os símbolos que aparecem acima dos inimigos para exorcizá-los.",
      biomesBoss: "Biomas & Chefes",
      biomesDesc: "Sobreviva a 10 fases para enfrentar o Boss do bioma.",
      biomesTip: "Dica: Destrua os sigilos vermelhos que protegem o Boss.",
      skills: "Habilidades",
      skillsDesc: "Desbloqueie suportes ao avançar fases (Total de Níveis).",
      shield: "Escudo",
      time: "Tempo",
      bomb: "Bomba",
      level: "Nível",
      understood: "Entendi",
      catNamePlaceholder: "Nome do Gato",
      tutorial: "Tutorial",
      feedback: "Feedback"
    },
    en: {
      grimoire: "Grimoire",
      magicGestures: "Magic Gestures",
      gesturesDesc: "Draw the symbols appearing above enemies to exorcise them.",
      biomesBoss: "Biomes & Bosses",
      biomesDesc: "Survive 10 waves to face the Biome Boss.",
      biomesTip: "Tip: Destroy red sigils protecting the Boss.",
      skills: "Skills",
      skillsDesc: "Unlock supports by clearing levels (Total Levels).",
      shield: "Shield",
      time: "Time",
      bomb: "Bomb",
      level: "Level",
      understood: "Got it",
      catNamePlaceholder: "Cat Name",
      tutorial: "Guide",
      feedback: "Feedback"
    }
  };

  const text = t[language];

  const handleStartClick = () => {
    if (name.trim()) {
        onStart(name.trim());
    } else {
        setShowInput(true);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim()) onStart(name.trim());
  }

  const toggleLanguage = () => {
      setLanguage(language === 'pt' ? 'en' : 'pt');
  }

  if (showTutorial) {
    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050f18]/95 backdrop-blur-md p-6 animate-fade-in text-white select-none">
            <button 
                onClick={() => setShowTutorial(false)}
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            >
                <X size={32} strokeWidth={1} />
            </button>

            <h2 className="text-3xl font-thin mb-8 uppercase tracking-[0.2em] text-center border-b border-white/20 pb-4">
                {text.grimoire}
            </h2>
            
            <div className="max-w-md w-full space-y-8 text-center text-sm font-light text-white/80 overflow-y-auto max-h-[70vh] px-4 scrollbar-hide">
                {/* Mechanic 1 */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-white font-normal mb-1">
                        <MousePointer2 size={20} />
                        <span>{text.magicGestures}</span>
                    </div>
                    <p className="text-white/60">{text.gesturesDesc}</p>
                    <div className="flex justify-center gap-6 mt-2 opacity-80 font-mono text-lg">
                        <div className="flex flex-col items-center gap-1"><span className="border border-white/30 px-3 py-1 rounded">—</span></div>
                        <div className="flex flex-col items-center gap-1"><span className="border border-white/30 px-3 py-1 rounded">|</span></div>
                        <div className="flex flex-col items-center gap-1"><span className="border border-white/30 px-3 py-1 rounded">^</span></div>
                    </div>
                </div>

                {/* Mechanic 2 */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-white font-normal mb-1">
                        <Skull size={20} />
                        <span>{text.biomesBoss}</span>
                    </div>
                    <p className="text-white/60">{text.biomesDesc}</p>
                    <p className="text-xs text-red-300">{text.biomesTip}</p>
                </div>

                {/* Mechanic 3 */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-white font-normal mb-1">
                        <Zap size={20} />
                        <span>{text.skills}</span>
                    </div>
                    <p className="text-white/60">{text.skillsDesc}</p>
                    <div className="grid grid-cols-3 gap-4 mt-2 w-full max-w-xs">
                        <div className="flex flex-col items-center border border-white/10 p-2 rounded bg-white/5">
                            <Shield className="text-white mb-1" size={24} strokeWidth={1.5} />
                            <span className="text-[10px] mt-1 uppercase">{text.shield}</span>
                            <span className="text-[8px] opacity-50">{text.level} 10</span>
                        </div>
                        <div className="flex flex-col items-center border border-white/10 p-2 rounded bg-white/5">
                            <Hourglass className="text-white mb-1" size={24} strokeWidth={1.5} />
                            <span className="text-[10px] mt-1 uppercase">{text.time}</span>
                            <span className="text-[8px] opacity-50">{text.level} 15</span>
                        </div>
                        <div className="flex flex-col items-center border border-white/10 p-2 rounded bg-white/5">
                            <Bomb className="text-white mb-1" size={24} strokeWidth={1.5} />
                            <span className="text-[10px] mt-1 uppercase">{text.bomb}</span>
                            <span className="text-[8px] opacity-50">{text.level} 30</span>
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => setShowTutorial(false)}
                className="mt-8 px-8 py-3 border border-white/30 rounded-full hover:bg-white hover:text-black transition-all uppercase tracking-widest text-xs"
            >
                {text.understood}
            </button>
        </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050f18] text-white p-6 animate-fade-in">
      
      {/* Language Toggle - Minimalist Emoji Style */}
      <button 
        onClick={toggleLanguage}
        className="absolute top-6 right-6 w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all text-2xl group"
        title={language === 'pt' ? 'Mudar para Inglês' : 'Switch to Portuguese'}
      >
        <span className="group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">
            {language === 'pt' ? '🇧🇷' : '🇺🇸'}
        </span>
      </button>

      {/* Title */}
      <h1 className="text-6xl font-thin tracking-[0.2em] mb-12 uppercase font-serif text-white/90 text-center">
        CatSalom
      </h1>

      {/* Center Character */}
      <div className="relative mb-16 group cursor-pointer" onClick={handleStartClick}>
        <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-700"></div>
        <Cat strokeWidth={1} size={120} className="text-white relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
      </div>

      {/* Input / Play */}
      {showInput ? (
          <form onSubmit={handleFormSubmit} className="flex flex-col items-center gap-4 animate-fade-in-up">
            <input 
                autoFocus
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={text.catNamePlaceholder}
                className="bg-transparent border-b border-white/30 text-center text-xl py-2 focus:outline-none focus:border-white transition-colors placeholder-white/20"
                maxLength={10}
            />
            <button type="submit" className="mt-4">
                <PlayCircle size={48} strokeWidth={1} className="text-white hover:scale-110 transition-transform"/>
            </button>
          </form>
      ) : (
        <button onClick={handleStartClick} className="group">
            <PlayCircle size={64} strokeWidth={0.8} className="text-white/80 group-hover:text-white group-hover:scale-110 transition-all duration-500" />
        </button>
      )}

      {/* Footer */}
      <div className="absolute bottom-8 flex gap-8">
        <button 
            onClick={() => setShowTutorial(true)}
            className="flex flex-col items-center text-white/30 hover:text-white/80 transition-colors gap-2"
        >
            <BookOpen size={20} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-wider">{text.tutorial}</span>
        </button>
        <a href="https://t.me/Rurocoli" target="_blank" rel="noreferrer" className="flex flex-col items-center text-white/30 hover:text-white/80 transition-colors gap-2">
            <MessageCircle size={20} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-wider">{text.feedback}</span>
        </a>
      </div>
    </div>
  );
};

export default Menu;