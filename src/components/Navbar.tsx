import React, { useState } from 'react';
import { Volume2, VolumeX, Shield, Sparkles, Database } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface NavbarProps {
  currentView: 'home' | 'game' | 'admin' | 'host';
  onNavigate: (view: 'home' | 'admin' | 'host') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const [isMuted, setIsMuted] = useState<boolean>(soundEffects.getMuted());
  const supabaseActive = isSupabaseConfigured();

  const handleToggleSound = () => {
    const newState = soundEffects.toggleMute();
    setIsMuted(newState);
  };

  return (
    <header className="sticky top-0 z-40 bg-kahoot-purple-dark/90 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 group transition-transform hover:scale-105 active:scale-95 text-left"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-md flex items-center justify-center transform -rotate-3 group-hover:rotate-0 transition-transform">
            <span className="text-kahoot-purple text-2xl md:text-3xl font-black tracking-tighter">
              K!
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl md:text-3xl font-black tracking-wider text-white drop-shadow">
                Kahoot<span className="text-kahoot-yellow">!</span>
              </span>
              <span className="bg-gradient-to-r from-kahoot-yellow to-amber-400 text-black text-[10px] md:text-xs font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                PRO
              </span>
            </div>
            <span className="hidden sm:block text-[11px] font-bold text-white/70 tracking-wide uppercase">
              Cuestionarios Interactivos
            </span>
          </div>
        </button>

        {/* Right Navigation & Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Supabase Indicator Pill - VISIBLE ÚNICAMENTE EN INTERFAZ ADMIN */}
          {currentView === 'admin' && (
            <div
              title={
                supabaseActive
                  ? 'Conectado a la base de datos de Supabase'
                  : 'Modo local activo (configura VITE_SUPABASE_URL en .env para enlazar)'
              }
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border ${
                supabaseActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{supabaseActive ? 'Supabase Conectado' : 'Modo Local / Demo'}</span>
            </div>
          )}

          {/* Audio Mute/Unmute Toggle */}
          <button
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition border border-white/10 flex items-center justify-center"
            title={isMuted ? 'Activar efectos de sonido' : 'Silenciar efectos'}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white/60" />
            ) : (
              <Volume2 className="w-5 h-5 text-kahoot-yellow animate-pulse" />
            )}
          </button>

          {/* Home Button if not on home */}
          {currentView !== 'home' && (
            <button
              onClick={() => onNavigate('home')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-sm transition border border-white/10"
            >
              Inicio
            </button>
          )}

          {/* Admin & Ranking Portal Button */}
          <button
            onClick={() => onNavigate('admin')}
            className={`flex items-center gap-2 px-3.5 md:px-5 py-2 md:py-2.5 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition-all duration-200 active:scale-95 ${
              currentView === 'admin'
                ? 'bg-white text-kahoot-purple shadow-xl ring-2 ring-kahoot-yellow'
                : 'bg-kahoot-yellow hover:bg-amber-400 text-black shadow-lg hover:shadow-yellow-500/30'
            }`}
          >
            <Shield className="w-4 h-4 md:w-5 md:h-5" />
            <span>Admin & Rankings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
