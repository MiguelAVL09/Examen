import { useState, useEffect } from 'react';
import type { Quiz, UserAccount } from './types/quiz';
import { quizService } from './services/quizService';
import { authService } from './services/authService';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { GamePlayView } from './components/GamePlayView';
import { AdminView } from './components/AdminView';
import { HostGameView } from './components/HostGameView';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { PinModal } from './components/PinModal';

export function App() {
  const [currentView, setCurrentView] = useState<'home' | 'game' | 'admin' | 'host'>('home');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [invitedQuiz, setInvitedQuiz] = useState<Quiz | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => authService.getCurrentUser());

  const [playerNickname, setPlayerNickname] = useState<string>(() => {
    const user = authService.getCurrentUser();
    return user?.name || user?.nickname || 'Colaborador';
  });
  const [playerAvatar, setPlayerAvatar] = useState<string>('🦊');
  const [playerBranch, setPlayerBranch] = useState<string | undefined>(() => {
    return authService.getCurrentUser()?.branch || undefined;
  });
  const [playerDepartment, setPlayerDepartment] = useState<string | undefined>(() => {
    return authService.getCurrentUser()?.department || undefined;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modales globales de Autenticación, Perfil y PIN
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  // Load quizzes on launch
  const refreshQuizzes = async () => {
    setIsLoading(true);
    try {
      const data = await quizService.getQuizzes();
      setQuizzes(data);
    } catch (err) {
      console.error('Error cargando cuestionarios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshQuizzes();
  }, []);

  // Check URL query parameters for direct quiz links (e.g. ?quiz=<id>)
  useEffect(() => {
    if (quizzes.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const quizParam = params.get('quiz');
      const alreadyCompleted = sessionStorage.getItem('kahoot_completed_quiz');
      if (quizParam && (!alreadyCompleted || alreadyCompleted !== quizParam)) {
        const found = quizzes.find(
          q => q.id === quizParam || q.title.toLowerCase().includes(quizParam.toLowerCase())
        );
        if (found) {
          setInvitedQuiz(found);
        } else {
          const fallback = quizzes.find(q => q.id === 'f3f7aa07-4389-4769-a162-3fb8b989bfc0') || quizzes[0];
          if (fallback) {
            setInvitedQuiz(fallback);
          }
        }
      }
    }
  }, [quizzes]);

  // Handle Solo Quiz Start
  const handleStartQuiz = (
    quiz: Quiz,
    nickname: string,
    avatar: string,
    branch?: string,
    department?: string
  ) => {
    setActiveQuiz(quiz);
    setPlayerNickname(nickname);
    setPlayerAvatar(avatar);
    setPlayerBranch(branch || currentUser?.branch);
    setPlayerDepartment(department || currentUser?.department);
    setInvitedQuiz(null);
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setCurrentView('game');
  };

  // Handle Host Live Game
  const handleHostGame = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentView('host');
  };

  // Handle Join with PIN
  const handleJoinWithPin = (_pin: string, nickname: string, avatar: string) => {
    if (quizzes.length > 0) {
      const targetQuiz = quizzes[0];
      handleStartQuiz(targetQuiz, nickname, avatar, currentUser?.branch, currentUser?.department);
    }
  };

  const handleNavigate = (view: 'home' | 'admin' | 'host') => {
    if (view === 'admin') {
      // Regla estricta: Solo los administradores autenticados pueden ver el panel
      if (!authService.isAdmin()) {
        setIsAuthModalOpen(true);
        return;
      }
    }
    if (view === 'home') {
      refreshQuizzes();
    }
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-kahoot-pattern flex flex-col justify-between selection:bg-amber-400 selection:text-black">
      {/* Sticky Navbar con botón de admin oculto para público */}
      <Navbar
        currentView={currentView}
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => {
          if (currentUser) {
            setIsProfileModalOpen(true);
          } else {
            setIsAuthModalOpen(true);
          }
        }}
        onOpenPinModal={() => setIsPinModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {isLoading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-lg font-black uppercase tracking-wider text-amber-300">
              Cargando Sistema Cinépolis...
            </span>
          </div>
        ) : (
          <>
            {currentView === 'home' && (
              <HomeView
                quizzes={quizzes}
                currentUser={currentUser}
                invitedQuiz={invitedQuiz}
                onClearInvitation={() => setInvitedQuiz(null)}
                onStartQuiz={handleStartQuiz}
                onHostGame={handleHostGame}
                onOpenPinModal={() => setIsPinModalOpen(true)}
              />
            )}

            {currentView === 'game' && activeQuiz && (
              <GamePlayView
                quiz={activeQuiz}
                nickname={playerNickname}
                avatar={playerAvatar}
                branch={playerBranch}
                department={playerDepartment}
                onExit={() => {
                  setInvitedQuiz(null);
                  if (activeQuiz) {
                    sessionStorage.setItem('kahoot_completed_quiz', activeQuiz.id);
                  }
                  if (typeof window !== 'undefined' && window.history) {
                    window.history.replaceState({}, '', window.location.pathname);
                  }
                  refreshQuizzes();
                  setCurrentView('home');
                }}
                onPlayAgain={() => {
                  const q = activeQuiz;
                  setActiveQuiz(null);
                  setTimeout(() => setActiveQuiz(q), 50);
                }}
              />
            )}

            {currentView === 'host' && activeQuiz && (
              <HostGameView
                quiz={activeQuiz}
                onExit={() => {
                  setInvitedQuiz(null);
                  if (activeQuiz) {
                    sessionStorage.setItem('kahoot_completed_quiz', activeQuiz.id);
                  }
                  if (typeof window !== 'undefined' && window.history) {
                    window.history.replaceState({}, '', window.location.pathname);
                  }
                  refreshQuizzes();
                  setCurrentView('home');
                }}
                onOpenAdmin={() => handleNavigate('admin')}
              />
            )}

            {currentView === 'admin' && (
              <AdminView
                onBackToHome={() => {
                  refreshQuizzes();
                  setCurrentView('home');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modal de Autenticación (Login, Registro y Recuperación de Contraseña) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={user => {
          setCurrentUser(user);
          setPlayerNickname(user.name || user.nickname);
          if (user.branch) setPlayerBranch(user.branch);
          if (user.department) setPlayerDepartment(user.department);
          // Si el usuario recién autenticado es admin, darle acceso directo al panel
          if (user.role === 'admin') {
            setCurrentView('admin');
          }
        }}
      />

      {/* Modal de Portal / Perfil del Colaborador */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          user={currentUser}
          quizzes={quizzes}
          onClose={() => setIsProfileModalOpen(false)}
          onLogout={() => {
            authService.logout();
            setCurrentUser(null);
            setIsProfileModalOpen(false);
            if (currentView === 'admin') {
              setCurrentView('home');
            }
          }}
          onUpdateUser={updated => {
            setCurrentUser(updated);
            setPlayerNickname(updated.name || updated.nickname);
            if (updated.branch) setPlayerBranch(updated.branch);
            if (updated.department) setPlayerDepartment(updated.department);
          }}
        />
      )}

      {/* Modal de Ingreso con PIN */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        initialNickname={currentUser?.name || currentUser?.nickname || playerNickname}
        initialAvatar={playerAvatar}
        onJoin={handleJoinWithPin}
      />

      {/* Footer Profesional Sin Exposición de Tecnologías */}
      <footer className="bg-black/50 border-t border-white/10 py-5 text-center text-xs text-white/50 font-semibold backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-amber-400">Cinépolis PRO</span>
            <span>•</span>
            <span>Plataforma Oficial de Capacitación y Evaluación</span>
          </div>
          <div className="text-white/60">
            © 2026 Cinépolis • Todos los derechos reservados. Acceso exclusivo para personal autorizado.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
