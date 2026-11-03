import React, { useState } from 'react';
import { Volume2, VolumeX, Shield, Gamepad2, User, KeyRound } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import type { UserAccount } from '../types/quiz';

interface NavbarProps {
  currentView: 'home' | 'game' | 'admin' | 'host';
  onNavigate: (view: 'home' | 'admin' | 'host') => void;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenPinModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenPinModal,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(soundEffects.getMuted());

  const handleToggleSound = () => {
    const newState = soundEffects.toggleMute();
    setIsMuted(newState);
  };

  const isAdminUser = currentUser?.role === 'admin' && currentUser?.isActive;

  return (
    <header className="sticky top-0 z-40 bg-[#070e22]/90 backdrop-blur-md border-b border-amber-400/20 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 group transition-transform hover:scale-105 active:scale-95 text-left"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-2xl shadow-lg flex items-center justify-center transform -rotate-3 group-hover:rotate-0 transition-transform">
            <span className="text-black text-2xl md:text-3xl font-black tracking-tighter">
              C!
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl md:text-2xl font-black tracking-wider text-white drop-shadow">
                Cinépolis<span className="text-amber-400">PRO</span>
              </span>
              <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[9px] md:text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                OFICIAL
              </span>
            </div>
            <span className="hidden sm:block text-[10px] md:text-[11px] font-bold text-white/70 tracking-wide uppercase">
              Evaluación y Capacitación Continua
            </span>
          </div>
        </button>

        {/* Right Navigation & Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Ingresar con PIN de Sala en Vivo (Botón superior discreto y limpio) */}
          <button
            onClick={onOpenPinModal}
            className="px-3 md:px-4 py-2 rounded-xl btn-cinepolis-primary text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow"
            title="Unirte a una partida grupal con código PIN"
          >
            <Gamepad2 className="w-4 h-4" />
            <span className="hidden sm:inline">Ingresar PIN</span>
          </button>

          {/* Audio Mute/Unmute Toggle */}
          <button
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition border border-white/10 flex items-center justify-center"
            title={isMuted ? 'Activar efectos de sonido' : 'Silenciar efectos'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-white/60" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
            )}
          </button>

          {/* Home Button if not on home */}
          {currentView !== 'home' && (
            <button
              onClick={() => onNavigate('home')}
              className="px-3.5 py-2 rounded-xl btn-cinepolis-glass text-xs font-bold transition"
            >
              Inicio
            </button>
          )}

          {/* Botón de Acceso al Panel de Administrador:
              ESTRICTAMENTE OCULTO para usuarios regulares o no identificados.
              Solo se muestra si la sesión activa es de nivel 'admin'. */}
          {isAdminUser && (
            <button
              onClick={() => onNavigate('admin')}
              className={`flex items-center gap-1.5 px-3.5 md:px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                currentView === 'admin'
                  ? 'bg-amber-400 text-black shadow-lg ring-2 ring-white'
                  : 'btn-cinepolis-gold'
              }`}
              title="Panel de Control y Métricas de Administrador"
            >
              <Shield className="w-4 h-4" />
              <span>Panel de Control</span>
            </button>
          )}

          {/* Identificación de Usuario / Colaborador */}
          {currentUser ? (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-white/10 border border-amber-400/40 text-xs font-bold transition shadow"
              title="Mi Perfil, Evaluaciones y Certificados"
            >
              <span className="text-base">👤</span>
              <div className="text-left hidden sm:block">
                <span className="font-extrabold text-white text-xs block leading-tight max-w-[110px] truncate">
                  {currentUser.name || currentUser.nickname}
                </span>
                <span className="text-[10px] text-amber-300 block leading-tight">
                  {currentUser.role === 'admin' ? 'Administrador' : (currentUser.branch || 'Colaborador')}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 md:px-4 py-2 rounded-xl btn-cinepolis-glass text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
              title="Iniciar sesión o registrarte como colaborador"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>Ingresar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
