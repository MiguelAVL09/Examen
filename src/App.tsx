import { useState, useEffect } from 'react';
import type { Quiz, UserAccount } from './types/quiz';
import { quizService } from './services/quizService';
import { authService } from './services/authService';
import { Navbar } from './components/Navbar';
import type { Destination } from './components/Navbar';
import { ExpertViewBoundary } from './components/ExpertViewBoundary';
import { HomeView } from './components/HomeView';
import { GamePlayView } from './components/GamePlayView';
import { AdminView } from './components/AdminView';
import { HostGameView } from './components/HostGameView';
import { KioskView } from './components/KioskView';
import { AuthScreen } from './components/AuthScreen';
import { UserProfileModal } from './components/UserProfileModal';
import { PinModal } from './components/PinModal';
import { isSurveyQuiz } from './utils/quizKind';
import { clearExpertLocation, expertHash, isExpertLocation } from './utils/expertLocation';
import ExpertDashboard from './ExpertDashboard';
import './QuizNavigation.css';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => authService.getCurrentUser());
  const [currentView, setCurrentView] = useState<Destination | 'game' | 'host'>(() =>
    currentUser?.role === 'expert' && isExpertLocation() ? 'expert' : 'home');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [invitedQuiz, setInvitedQuiz] = useState<Quiz | null>(null);
  const isExpert = currentUser?.role === 'expert' && currentUser.isActive;
  const isAdmin = currentUser?.role === 'admin' && currentUser.isActive;
  const view = (currentView === 'expert' && !isExpert) ||
    ((currentView === 'admin' || currentView === 'kiosk') && !isAdmin) ? 'home' : currentView;

  const [playerNickname, setPlayerNickname] = useState<string>(() => {
    const user = authService.getCurrentUser();
    return user?.name || user?.nickname || 'Colaborador';
  });
  const [playerAvatar, setPlayerAvatar] = useState<string>('🦊');
  const [playerDepartment, setPlayerDepartment] = useState<string | undefined>(() => {
    return authService.getCurrentUser()?.department || undefined;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [quizLoadError, setQuizLoadError] = useState(false);
  const [focusSurveys, setFocusSurveys] = useState(false);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  // Load quizzes on launch
  const refreshQuizzes = async () => {
    setIsLoading(true);
    setQuizLoadError(false);
    try {
      const data = await quizService.getQuizzes();
      setQuizzes(data);
    } catch (err) {
      setQuizLoadError(true);
      console.error('Error cargando cuestionarios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const accountId = currentUser?.id;
  useEffect(() => {
    if (accountId) void refreshQuizzes();
  }, [accountId]);

  useEffect(() => {
    if (!isExpert) return;
    function syncExpertLocation() {
      if (isExpertLocation()) setCurrentView('expert');
      else setCurrentView(previous => previous === 'expert' ? 'home' : previous);
    }
    window.addEventListener('hashchange', syncExpertLocation);
    return () => window.removeEventListener('hashchange', syncExpertLocation);
  }, [isExpert]);

  useEffect(() => {
    if (!focusSurveys || currentView !== 'home' || isLoading) return;
    const section = document.getElementById('encuestas');
    if (section) {
      section.focus({ preventScroll: true });
      section.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    setFocusSurveys(false);
  }, [focusSurveys, currentView, isLoading]);

  useEffect(() => {
    if (!currentUser) return;
    function refreshSession() {
      const user = authService.getCurrentUser();
      if (!user) {
        setCurrentView('home');
        setIsProfileModalOpen(false);
        setIsPinModalOpen(false);
        clearExpertLocation();
      } else if (currentUser?.role !== user.role) {
        if (user.role !== 'expert') clearExpertLocation();
        setCurrentView(previous => {
          if (previous === 'expert' && user.role !== 'expert') return 'home';
          if ((previous === 'admin' || previous === 'kiosk') && user.role !== 'admin') return 'home';
          return previous;
        });
      }
      setCurrentUser(previous => JSON.stringify(previous) === JSON.stringify(user) ? previous : user);
    }
    window.addEventListener('focus', refreshSession);
    window.addEventListener('storage', refreshSession);
    const timer = window.setInterval(refreshSession, 15000);
    return () => {
      window.removeEventListener('focus', refreshSession);
      window.removeEventListener('storage', refreshSession);
      window.clearInterval(timer);
    };
  }, [currentUser]);

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
    _branch?: string,
    department?: string
  ) => {
    setActiveQuiz(quiz);
    setPlayerNickname(nickname);
    setPlayerAvatar(avatar);
    setPlayerDepartment(department || currentUser?.department);
    setInvitedQuiz(null);
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setCurrentView('game');
    window.scrollTo({ top: 0 });
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
      handleStartQuiz(targetQuiz, nickname, avatar, undefined, currentUser?.department);
    }
  };

  const handleNavigate = (view: Destination) => {
    const session = authService.getCurrentUser();
    if (!session) {
      setCurrentUser(null);
      setCurrentView('home');
      clearExpertLocation();
      return;
    }
    if ((view === 'admin' || view === 'kiosk') && session.role !== 'admin') return;
    if (view === 'expert' && session.role !== 'expert') return;
    if (view === 'home') {
      if (currentView === 'admin' || currentView === 'kiosk') void refreshQuizzes();
      clearExpertLocation();
    }
    if (view === 'expert' && !isExpertLocation()) location.hash = expertHash;
    setCurrentView(view);
    window.scrollTo({ top: 0 });
  };

  const openSurveys = () => {
    if (currentView !== 'home') handleNavigate('home');
    setFocusSurveys(true);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setIsProfileModalOpen(false);
    setIsPinModalOpen(false);
    setInvitedQuiz(null);
    setActiveQuiz(null);
    setFocusSurveys(false);
    setCurrentView('home');
    clearExpertLocation();
    window.scrollTo({ top: 0 });
  };

  if (!currentUser) {
    return <AuthScreen onAuthenticated={() => {
      const user = authService.getCurrentUser();
      if (!user) return false;
      clearExpertLocation();
      setIsLoading(true);
      setCurrentUser(user);
      setPlayerNickname(user.name || user.nickname);
      setPlayerDepartment(user.department || undefined);
      setCurrentView('home');
      window.scrollTo({ top: 0 });
      return true;
    }} />;
  }

  return (
    <div className="quiz-app min-h-screen bg-kahoot-pattern flex flex-col justify-between selection:bg-amber-400 selection:text-black">
      {view !== 'kiosk' && (
        <Navbar
          currentView={view}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onOpenSurveys={openSurveys}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenPinModal={() => setIsPinModalOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {view === 'expert' ? (
          <ExpertViewBoundary onBack={openSurveys}>
            <ExpertDashboard onBack={openSurveys} />
          </ExpertViewBoundary>
        ) : view === 'home' && isLoading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-lg font-black uppercase tracking-wider text-amber-300">
              Cargando Sistema Cinépolis...
            </span>
          </div>
        ) : (
          <>
            {view === 'home' && (
              quizLoadError && quizzes.length === 0 ? <section className="quiz-message" role="alert">
                <h1>No se pudieron cargar las actividades</h1>
                <p>Intenta cargar las encuestas y evaluaciones otra vez.</p>
                <button type="button" className="quiz-action quiz-action-primary" onClick={() => void refreshQuizzes()}>Volver a cargar</button>
              </section> : <HomeView
                quizzes={quizzes}
                currentUser={currentUser}
                invitedQuiz={invitedQuiz}
                onClearInvitation={() => setInvitedQuiz(null)}
                onStartQuiz={handleStartQuiz}
                onHostGame={handleHostGame}
                onOpenPinModal={() => setIsPinModalOpen(true)}
                onOpenSurveys={openSurveys}
              />
            )}

            {view === 'game' && activeQuiz && (
              <GamePlayView
                quiz={activeQuiz}
                nickname={playerNickname}
                avatar={playerAvatar}
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
                  if (isSurveyQuiz(activeQuiz)) setFocusSurveys(true);
                }}
                onPlayAgain={() => {
                  const q = activeQuiz;
                  setActiveQuiz(null);
                  setTimeout(() => setActiveQuiz(q), 50);
                }}
              />
            )}

            {view === 'host' && activeQuiz && (
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

            {view === 'admin' && (
              <AdminView
                onBackToHome={() => handleNavigate('home')}
                onOpenKiosk={() => handleNavigate('kiosk')}
                onLogout={handleLogout}
              />
            )}

            {view === 'kiosk' && (
              <KioskView
                quizzes={quizzes}
                onStartQuiz={(quiz, nickname, avatar, _branch, department) => {
                  handleStartQuiz(quiz, nickname, avatar, undefined, department);
                }}
                onExitKiosk={() => {
                  refreshQuizzes();
                  setCurrentView('home');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modal de Portal / Perfil del Colaborador */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          user={currentUser}
          quizzes={quizzes}
          onClose={() => setIsProfileModalOpen(false)}
          onLogout={handleLogout}
          onUpdateUser={updated => {
            setCurrentUser(updated);
            setPlayerNickname(updated.name || updated.nickname);
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
      {view !== 'kiosk' && view !== 'expert' && (
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
      )}
    </div>
  );
}

export default App;
