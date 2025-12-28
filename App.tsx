import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import Menu from './components/Menu';
import GameOver from './components/GameOver';
import { GameState, Language } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [catName, setCatName] = useState<string>('Gato');
  const [score, setScore] = useState<number>(0);
  const [language, setLanguage] = useState<Language>('pt');

  const startGame = (name: string) => {
    setCatName(name);
    setGameState(GameState.PLAYING);
    setScore(0);
  };

  const restartGame = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
  };

  return (
    <div className="w-full h-screen bg-[#050f18] text-white overflow-hidden font-sans select-none">
      <GameCanvas 
        gameState={gameState} 
        setGameState={setGameState}
        score={score}
        setScore={setScore}
        catName={catName}
        language={language}
      />

      {gameState === GameState.MENU && (
        <Menu 
            onStart={startGame} 
            language={language}
            setLanguage={setLanguage}
        />
      )}

      {gameState === GameState.GAME_OVER && (
        <GameOver 
            score={score} 
            catName={catName} 
            onRestart={restartGame} 
            language={language}
        />
      )}
    </div>
  );
};

export default App;