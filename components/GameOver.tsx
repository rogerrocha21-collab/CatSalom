import React from 'react';
import { RotateCcw, Home } from 'lucide-react';
import { Language } from '../types';

interface GameOverProps {
  score: number;
  catName: string;
  onRestart: () => void;
  language: Language;
}

const GameOver: React.FC<GameOverProps> = ({ score, catName, onRestart, language }) => {
  const t = {
      pt: {
          finalScore: 'Pontuação Final',
          journeyEnd: (name: string) => <>A jornada de <span className="font-bold border-b border-white/20">{name}</span> terminou.</>,
          menu: 'Menu',
          restart: 'Reiniciar'
      },
      en: {
          finalScore: 'Final Score',
          journeyEnd: (name: string) => <>The journey of <span className="font-bold border-b border-white/20">{name}</span> has ended.</>,
          menu: 'Menu',
          restart: 'Restart'
      }
  }[language];

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 text-center animate-fade-in">
      
      <div className="mb-8">
          <span className="text-6xl font-thin text-white block mb-2">{score}</span>
          <span className="text-xs text-white/40 uppercase tracking-[0.3em]">{t.finalScore}</span>
      </div>

      <h2 className="text-xl text-white/80 mb-12 font-light">
        {t.journeyEnd(catName)}
      </h2>

      <div className="flex gap-8">
        <button
            onClick={() => window.location.reload()} // Simple way to go to menu for now
            className="flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors group"
        >
            <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white transition-colors">
                <Home size={24} strokeWidth={1} />
            </div>
            <span className="text-[10px] uppercase tracking-widest">{t.menu}</span>
        </button>

        <button
            onClick={onRestart}
            className="flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors group"
        >
            <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white transition-colors">
                <RotateCcw size={24} strokeWidth={1} />
            </div>
            <span className="text-[10px] uppercase tracking-widest">{t.restart}</span>
        </button>
      </div>
    </div>
  );
};

export default GameOver;