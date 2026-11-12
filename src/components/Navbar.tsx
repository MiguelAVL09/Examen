import { useRef, useState } from 'react';
import {
  ChevronRight, ClipboardList, Gamepad2, GraduationCap, LogOut,
  Menu, Plus, ShieldCheck, Smartphone, UserRound, Volume2, VolumeX, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import type { UserAccount } from '../types/quiz';

export type Destination = 'home' | 'expert' | 'admin' | 'kiosk';

interface NavbarProps {
  currentView: Destination | 'game' | 'host';
  onNavigate: (view: Destination) => void;
  currentUser: UserAccount;
  onOpenSurveys: () => void;
  onCreateSurvey?: () => void;
  onOpenProfile: () => void;
  onOpenPinModal: () => void;
  onLogout: () => void;
}

interface MenuItem {
  label: string;
  description: string;
  icon: LucideIcon;
  action: () => void;
  current?: boolean;
}

const roleLabel = { user: 'Colaborador', expert: 'Cinepolito Experto', admin: 'Administrador' };

export function Navbar({
  currentView, onNavigate, currentUser, onOpenSurveys, onCreateSurvey, onOpenProfile, onOpenPinModal, onLogout,
}: NavbarProps) {
  const [isMuted, setIsMuted] = useState(() => soundEffects.getMuted());
  const [menuOpen, setMenuOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const role = currentUser.role;

  function choose(action: () => void) {
    drawer.current?.close();
    action();
  }

  const items: MenuItem[] = [
    { label: 'Encuestas y evaluaciones', description: 'Ve a las actividades disponibles', icon: ClipboardList, action: onOpenSurveys, current: currentView === 'home' },
  ];
  if (onCreateSurvey) items.push({ label: 'Crear encuesta de Kahoot', description: 'Abre el editor de encuestas', icon: Plus, action: onCreateSurvey });
  if (role === 'expert') {
    items.push({ label: 'Panel de expertos', description: 'Consulta tareas y cursos de Learning Center', icon: GraduationCap, action: () => onNavigate('expert'), current: currentView === 'expert' });
  }
  if (role === 'admin') {
    items.push(
      { label: 'Administración', description: 'Gestiona encuestas, resultados y usuarios', icon: ShieldCheck, action: () => onNavigate('admin'), current: currentView === 'admin' },
      { label: 'Modo kiosco', description: 'Abre la vista para una pantalla compartida', icon: Smartphone, action: () => onNavigate('kiosk') },
    );
  }
  items.push({ label: 'Mi perfil', description: 'Consulta tus datos y resultados', icon: UserRound, action: onOpenProfile });
  items.push({ label: 'Unirme con PIN', description: 'Abre la actividad de una sala', icon: Gamepad2, action: onOpenPinModal });

  return (
    <header className="quiz-header">
      <div className="quiz-header-content">
        <button type="button" onClick={() => onNavigate('home')} className="quiz-brand" aria-label="Cinépolis PRO, inicio">
          <span className="quiz-brand-mark" aria-hidden="true">C!</span>
          <span>Cinépolis <strong>PRO</strong></span>
        </button>
        <div className="quiz-header-actions">
          <button type="button" className="quiz-header-surveys" onClick={onOpenSurveys}><ClipboardList size={19} aria-hidden="true" /> Encuestas</button>
          <button type="button" className="quiz-menu-button" aria-haspopup="dialog" aria-controls="account-menu" aria-expanded={menuOpen} onClick={() => {
            drawer.current?.showModal();
            setMenuOpen(true);
          }}>
            <Menu size={22} aria-hidden="true" /> <span>Menú</span>
          </button>
        </div>
      </div>

      <dialog id="account-menu" ref={drawer} className="account-drawer" aria-labelledby="account-menu-title" onClose={() => setMenuOpen(false)} onClick={event => {
        if (event.target === event.currentTarget) {
          const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
          if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) drawer.current?.close();
        }
      }}>
        <div className="drawer-layout">
          <div className="drawer-heading">
            <h2 id="account-menu-title">Menú</h2>
            <button type="button" aria-label="Cerrar menú" className="drawer-close" onClick={() => drawer.current?.close()}><X size={24} aria-hidden="true" /></button>
          </div>
          <div className="drawer-account">
            <span className="drawer-avatar" aria-hidden="true">{(currentUser.name || currentUser.nickname || 'C').trim().charAt(0).toUpperCase()}</span>
            <div><strong>{currentUser.name || currentUser.nickname}</strong><span>{roleLabel[role]}</span></div>
          </div>
          <nav className="drawer-nav" aria-label="Espacios disponibles">
            {items.map(({ label, description, icon: Icon, action, current }) => (
              <button type="button" key={label} className="drawer-item" aria-current={current ? 'page' : undefined} onClick={() => choose(action)}>
                <span className="drawer-item-icon"><Icon size={22} aria-hidden="true" /></span>
                <span><strong>{label}</strong><small>{description}</small></span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </nav>
          <div className="drawer-footer">
            <button type="button" className="drawer-utility" aria-pressed={!isMuted} onClick={() => setIsMuted(soundEffects.toggleMute())}>
              {isMuted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
              <span>Sonido</span><small>{isMuted ? 'Desactivado' : 'Activado'}</small>
            </button>
            <button type="button" className="drawer-utility" onClick={() => choose(onLogout)}><LogOut size={20} aria-hidden="true" /> Cerrar sesión</button>
          </div>
        </div>
      </dialog>
    </header>
  );
}
