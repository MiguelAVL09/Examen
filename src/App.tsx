import { useState, useEffect } from 'react';
import type { Quiz } from './types/quiz';
import { quizService } from './services/quizService';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { GamePlayView } from './components/GamePlayView';
import { AdminView } from './components/AdminView';
import { HostGameView } from './components/HostGameView';

export function App() {
  const [currentView, setCurrentView] = useState<'home' | 'game' | 'admin' | 'host'>('home');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [playerNickname, setPlayerNickname] = useState<string>('Jugador');
  const [playerAvatar, setPlayerAvatar] = useState<string>('🦊');
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Handle Solo Quiz Start
  const handleStartQuiz = (quiz: Quiz, nickname: string, avatar: string) => {
    setActiveQuiz(quiz);
    setPlayerNickname(nickname);
    setPlayerAvatar(avatar);
    setCurrentView('game');
  };

  // Handle Host Live Game
  const handleHostGame = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentView('host');
  };

  // Handle Join with PIN
  const handleJoinWithPin = (_pin: string, nickname: string, avatar: string) => {
    // When a player joins via PIN, launch the quiz challenge assigned to that session
    if (quizzes.length > 0) {
      const targetQuiz = quizzes[0];
      handleStartQuiz(targetQuiz, nickname, avatar);
    }
  };

  return (
    <div className="min-h-screen bg-kahoot-pattern flex flex-col justify-between selection:bg-kahoot-yellow selection:text-black">
      {/* Sticky Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={view => {
          if (view === 'home') {
            refreshQuizzes();
          }
          setCurrentView(view);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {isLoading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 border-4 border-kahoot-yellow border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-lg font-black uppercase tracking-wider">
              Cargando Cuestionarios...
            </span>
          </div>
        ) : (
          <>
            {currentView === 'home' && (
              <HomeView
                quizzes={quizzes}
                onStartQuiz={handleStartQuiz}
                onHostGame={handleHostGame}
                onJoinWithPin={handleJoinWithPin}
                onOpenAdmin={() => setCurrentView('admin')}
              />
            )}

            {currentView === 'game' && activeQuiz && (
              <GamePlayView
                quiz={activeQuiz}
                nickname={playerNickname}
                avatar={playerAvatar}
                onExit={() => {
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
                  refreshQuizzes();
                  setCurrentView('home');
                }}
                onOpenAdmin={() => setCurrentView('admin')}
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

      {/* Footer */}
      <footer className="bg-black/40 border-t border-white/10 py-6 text-center text-xs text-white/50 font-semibold backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-white text-sm">Kahoot! Pro Quiz</span>
            <span>•</span>
            <span>Plataforma Interactiva para Exámenes y Dinámicas</span>
          </div>
          <div>
            Listo para subir a <strong className="text-white">GitHub</strong> & conectar con <strong className="text-emerald-400">Supabase</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
