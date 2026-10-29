import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Trophy,
  Users,
  Search,
  Download,
  Trash2,
  Plus,
  Edit,
  Flame,
  CheckCircle2,
  Database,
  Lock,
  RefreshCw,
  ChevronDown,
  BookOpen,
  HelpCircle,
  CheckSquare,
  Shuffle,
  Keyboard,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Copy,
  FileDown,
  FileUp,
  Files
} from 'lucide-react';
import type { Participant, Quiz, Question, QuestionType } from '../types/quiz';
import { quizService } from '../services/quizService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { processImageUpload, PRESET_IMAGES } from '../utils/imageUtils';
import { KahootShapeIcon } from './KahootShapes';

interface AdminViewProps {
  onBackToHome: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onBackToHome }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('kahoot_admin_auth') === 'true';
  });
  const [passcode, setPasscode] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'rankings' | 'quizzes' | 'supabase'>('rankings');

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [rankings, setRankings] = useState<Participant[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [jsonBackupStatus, setJsonBackupStatus] = useState<string>('');

  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Hidden file input refs
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // REQUERIMIENTO CLAVE: Cuando los administradores cierren la web o naveguen fuera,
  // la sesión de admin se cierra automáticamente para pedir la contraseña de nuevo.
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('kahoot_admin_auth');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Al salir de la vista de admin, revocar sesión
      sessionStorage.removeItem('kahoot_admin_auth');
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allQuizzes = await quizService.getQuizzes();
      setQuizzes(allQuizzes);

      const allRankings = await quizService.getRankings(
        selectedQuizId === 'all' ? undefined : selectedQuizId
      );
      setRankings(allRankings);
    } catch (err) {
      console.error('Error cargando datos de admin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, selectedQuizId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('kahoot_admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('PIN incorrecto. (PIN por defecto: admin123)');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('kahoot_admin_auth');
    onBackToHome();
  };

  // Exportar y Respaldar Cuestionarios a archivo JSON
  const handleDownloadQuizzesBackup = () => {
    const jsonStr = quizService.exportQuizzesToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kahoot_cuestionarios_respaldo_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setJsonBackupStatus('¡Archivo de respaldo descargado exitosamente en tu equipo!');
    setTimeout(() => setJsonBackupStatus(''), 4000);
  };

  // Importar Cuestionarios desde archivo JSON
  const handleImportQuizzesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async event => {
        const content = event.target?.result as string;
        const res = await quizService.importQuizzesFromJson(content);
        setJsonBackupStatus(res.message);
        if (res.success) {
          await loadData();
        }
        setTimeout(() => setJsonBackupStatus(''), 4000);
      };
      reader.readAsText(file);
    } catch (err: any) {
      setJsonBackupStatus(`Error al importar: ${err.message}`);
    }
    // Reset file input
    if (importFileInputRef.current) importFileInputRef.current.value = '';
  };

  // Duplicar cuestionario
  const handleDuplicateQuiz = async (quiz: Quiz) => {
    const duplicated: Quiz = {
      ...JSON.parse(JSON.stringify(quiz)),
      id: 'quiz-' + Date.now(),
      title: `${quiz.title} (Copia)`,
      createdAt: new Date().toISOString(),
    };
    await quizService.saveQuiz(duplicated);
    await loadData();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (rankings.length === 0) return;

    const headers = ['Posicion', 'Nickname', 'Cuestionario', 'Puntaje Total', 'Aciertos', 'Total Preguntas', 'Precision (%)', 'Mejor Racha', 'Fecha'];
    const rows = filteredRankings.map((p, idx) => {
      const q = quizzes.find(item => item.id === p.quizId);
      return [
        idx + 1,
        `"${p.nickname}"`,
        `"${q?.title || p.quizId}"`,
        p.totalScore,
        p.correctAnswersCount,
        p.totalQuestionsCount,
        `${p.accuracyPercentage}%`,
        p.maxStreak,
        `"${new Date(p.completedAt).toLocaleString()}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kahoot_rankings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearRankings = async () => {
    if (window.confirm('¿Estás seguro de que deseas borrar los rankings? Esta acción no se puede deshacer.')) {
      await quizService.clearRankings(selectedQuizId === 'all' ? undefined : selectedQuizId);
      await loadData();
    }
  };

  const handleSyncToSupabase = async () => {
    setSyncStatus('Sincronizando...');
    const res = await quizService.syncSeedToSupabase();
    setSyncStatus(res.message);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (window.confirm('¿Deseas eliminar este cuestionario? Se eliminarán también sus preguntas asociadas.')) {
      await quizService.deleteQuiz(quizId);
      await loadData();
    }
  };

  const handleQuestionTypeChange = (qIdx: number, newType: QuestionType) => {
    if (!editingQuiz) return;
    const updated = [...editingQuiz.questions];
    const ques = updated[qIdx];
    ques.questionType = newType;

    if (newType === 'multiple_choice') {
      ques.options = [
        { id: 'opt-' + Date.now() + '-1', text: ques.options[0]?.text || '', isCorrect: true, color: 'red', shape: 'triangle' },
        { id: 'opt-' + Date.now() + '-2', text: ques.options[1]?.text || '', isCorrect: false, color: 'blue', shape: 'diamond' },
        { id: 'opt-' + Date.now() + '-3', text: ques.options[2]?.text || '', isCorrect: false, color: 'yellow', shape: 'circle' },
        { id: 'opt-' + Date.now() + '-4', text: ques.options[3]?.text || '', isCorrect: false, color: 'green', shape: 'square' },
      ];
      ques.correctOrder = undefined;
      ques.acceptedAnswers = undefined;
    } else if (newType === 'true_false') {
      ques.options = [
        { id: 'tf-' + Date.now() + '-1', text: 'VERDADERO', isCorrect: true, color: 'blue', shape: 'diamond' },
        { id: 'tf-' + Date.now() + '-2', text: 'FALSO', isCorrect: false, color: 'red', shape: 'triangle' },
      ];
      ques.correctOrder = undefined;
      ques.acceptedAnswers = undefined;
    } else if (newType === 'puzzle') {
      const puz1 = 'puz-' + Date.now() + '-1';
      const puz2 = 'puz-' + Date.now() + '-2';
      const puz3 = 'puz-' + Date.now() + '-3';
      const puz4 = 'puz-' + Date.now() + '-4';
      ques.options = [
        { id: puz1, text: 'Paso 1 (Primero)', isCorrect: true, color: 'red', shape: 'triangle', orderIndex: 0 },
        { id: puz2, text: 'Paso 2 (Segundo)', isCorrect: true, color: 'blue', shape: 'diamond', orderIndex: 1 },
        { id: puz3, text: 'Paso 3 (Tercero)', isCorrect: true, color: 'yellow', shape: 'circle', orderIndex: 2 },
        { id: puz4, text: 'Paso 4 (Último)', isCorrect: true, color: 'green', shape: 'square', orderIndex: 3 },
      ];
      ques.correctOrder = [puz1, puz2, puz3, puz4];
      ques.acceptedAnswers = undefined;
    } else if (newType === 'type_answer') {
      ques.options = [];
      ques.correctOrder = undefined;
      ques.acceptedAnswers = [''];
    }

    setEditingQuiz({ ...editingQuiz, questions: updated });
  };

  const handleImageFileChange = async (qIdx: number, file: File | null) => {
    if (!file || !editingQuiz) return;
    try {
      const compressedDataUrl = await processImageUpload(file);
      const updated = [...editingQuiz.questions];
      updated[qIdx].imageUrl = compressedDataUrl;
      setEditingQuiz({ ...editingQuiz, questions: updated });
    } catch (err: any) {
      alert(err.message || 'Error al procesar la imagen.');
    }
  };

  const handleCoverImageChange = async (file: File | null) => {
    if (!file || !editingQuiz) return;
    try {
      const compressedDataUrl = await processImageUpload(file, 900, 500);
      setEditingQuiz({ ...editingQuiz, coverImage: compressedDataUrl });
    } catch (err: any) {
      alert(err.message || 'Error al procesar la imagen.');
    }
  };

  const filteredRankings = rankings.filter(p =>
    p.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pantalla de Bloqueo de Acceso
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-kahoot-purple-dark/95 border-2 border-white/20 rounded-3xl p-8 max-w-md w-full shadow-2xl backdrop-blur-md text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-tr from-kahoot-yellow to-amber-400 rounded-3xl flex items-center justify-center shadow-lg text-black">
            <Lock className="w-10 h-10" />
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2">
            Panel de Administración
          </h2>
          <p className="text-white/70 text-sm mb-6 font-semibold">
            Acceso restringido. Por seguridad, la sesión se cierra automáticamente al salir de la web o cerrar la pestaña.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Ingresa el PIN de Admin..."
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-black/40 border-2 border-white/20 text-white placeholder-white/40 font-black text-center text-xl tracking-widest focus:outline-none focus:border-kahoot-yellow transition"
                autoFocus
              />
              {authError && (
                <p className="text-red-400 text-xs font-bold mt-2">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-kahoot-yellow hover:bg-amber-400 text-black font-black uppercase tracking-wider text-sm shadow-xl active:scale-95 transition"
            >
              Acceder al Panel
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-xs text-white/50">
            <span>PIN predeterminado para pruebas: </span>
            <code className="text-kahoot-yellow font-black px-1.5 py-0.5 bg-black/40 rounded">
              admin123
            </code>
          </div>

          <button
            onClick={onBackToHome}
            className="mt-4 text-xs font-bold text-white/70 hover:text-white underline"
          >
            Volver al menú de juegos
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-80px)]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-kahoot-yellow text-black rounded-2xl shadow-md">
              <Shield className="w-6 h-6" />
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
              Control de Administrador
            </h1>
          </div>
          <p className="text-white/70 font-semibold mt-1">
            Visualización de rankings privados, gestor de cuestionarios y respaldo seguro de tus preguntas creadas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refrescar datos"
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 font-bold rounded-xl text-sm transition active:scale-95"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1.5 bg-black/30 rounded-2xl border border-white/10 mb-8 max-w-xl">
        <button
          onClick={() => setActiveTab('rankings')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'rankings'
              ? 'bg-kahoot-yellow text-black shadow-lg'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Rankings & Resultados</span>
        </button>

        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'quizzes'
              ? 'bg-kahoot-yellow text-black shadow-lg'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Gestor de Cuestionarios</span>
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'supabase'
              ? 'bg-kahoot-yellow text-black shadow-lg'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Base de Datos</span>
        </button>
      </div>

      {/* TAB 1: RANKINGS */}
      {activeTab === 'rankings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-white/10 shadow-lg">
              <span className="text-xs uppercase font-bold text-white/60">Total Participantes</span>
              <div className="text-3xl font-black text-white mt-1">{rankings.length}</div>
            </div>

            <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-white/10 shadow-lg">
              <span className="text-xs uppercase font-bold text-white/60">Puntaje Récord</span>
              <div className="text-3xl font-black text-kahoot-yellow mt-1">
                {rankings.length > 0
                  ? Math.max(...rankings.map(r => r.totalScore)).toLocaleString()
                  : 0}
              </div>
            </div>

            <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-white/10 shadow-lg">
              <span className="text-xs uppercase font-bold text-white/60">Precisión Promedio</span>
              <div className="text-3xl font-black text-green-400 mt-1">
                {rankings.length > 0
                  ? Math.round(
                      rankings.reduce((acc, curr) => acc + curr.accuracyPercentage, 0) /
                        rankings.length
                    )
                  : 0}
                %
              </div>
            </div>

            <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-white/10 shadow-lg">
              <span className="text-xs uppercase font-bold text-white/60">Cuestionarios Activos</span>
              <div className="text-3xl font-black text-blue-400 mt-1">{quizzes.length}</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-kahoot-purple-dark/80 p-4 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative">
                <select
                  value={selectedQuizId}
                  onChange={e => setSelectedQuizId(e.target.value)}
                  className="px-4 py-2.5 pr-10 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm appearance-none focus:outline-none focus:border-kahoot-yellow"
                >
                  <option value="all">Todos los Cuestionarios ({quizzes.length})</option>
                  {quizzes.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-white/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 text-sm font-semibold focus:outline-none focus:border-kahoot-yellow"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={handleExportCSV}
                disabled={rankings.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white rounded-xl text-sm font-bold border border-white/10 transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={handleClearRankings}
                disabled={rankings.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600/30 hover:bg-red-600/50 disabled:opacity-40 text-red-200 rounded-xl text-sm font-bold border border-red-500/30 transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpiar</span>
              </button>
            </div>
          </div>

          <div className="bg-kahoot-purple-dark/80 rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-md">
            {filteredRankings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/20 text-[11px] uppercase font-black tracking-wider text-white/60">
                      <th className="py-4 px-6">Posición</th>
                      <th className="py-4 px-6">Jugador</th>
                      <th className="py-4 px-6">Cuestionario</th>
                      <th className="py-4 px-6 text-right">Puntaje Total</th>
                      <th className="py-4 px-6 text-center">Aciertos</th>
                      <th className="py-4 px-6 text-center">Precisión</th>
                      <th className="py-4 px-6 text-center">Racha Máx</th>
                      <th className="py-4 px-6 text-right">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-semibold text-sm">
                    {filteredRankings.map((p, index) => {
                      const quizInfo = quizzes.find(q => q.id === p.quizId);
                      const isTop3 = index < 3;
                      const badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

                      return (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${
                                isTop3
                                  ? 'bg-kahoot-yellow/20 text-amber-300 border border-kahoot-yellow/40'
                                  : 'text-white/60'
                              }`}
                            >
                              {badge}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{p.avatar || '🦊'}</span>
                              <span className="font-extrabold text-white text-base">
                                {p.nickname}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 max-w-xs truncate text-white/80">
                            {quizInfo?.title || 'Cuestionario General'}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="font-black text-base text-kahoot-yellow">
                              {p.totalScore.toLocaleString()}
                            </span>
                            <span className="text-xs text-white/60 ml-1">pts</span>
                          </td>
                          <td className="py-4 px-6 text-center text-white/90 font-bold">
                            {p.correctAnswersCount} / {p.totalQuestionsCount}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                p.accuracyPercentage >= 80
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : p.accuracyPercentage >= 50
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {p.accuracyPercentage}%
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="inline-flex items-center gap-1 text-amber-300 font-extrabold">
                              <Flame className="w-4 h-4" />
                              <span>x{p.maxStreak}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right text-xs text-white/50">
                            {new Date(p.completedAt).toLocaleDateString()} {new Date(p.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-white/60">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-bold">No se encontraron participantes registrados aún.</p>
                <p className="text-xs text-white/40 mt-1">
                  Cuando los usuarios jueguen un cuestionario, sus resultados aparecerán aquí automáticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GESTOR DE CUESTIONARIOS & RESPALDO JSON */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          {/* Action Bar: Create, Backup JSON, Restore JSON */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-kahoot-purple-dark/80 p-5 rounded-3xl border border-white/10 shadow-lg">
            <div>
              <h2 className="text-2xl font-black uppercase text-white tracking-tight">
                Cuestionarios Disponibles ({quizzes.length})
              </h2>
              <span className="text-xs text-white/60 font-semibold">
                Tus cuestionarios creados se preservan localmente y puedes respaldarlos como archivo JSON.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Descargar Respaldo JSON */}
              <button
                onClick={handleDownloadQuizzesBackup}
                title="Descargar todos tus cuestionarios en un archivo JSON"
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition active:scale-95"
              >
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>Respaldar (JSON)</span>
              </button>

              {/* Importar desde JSON */}
              <label
                title="Cargar cuestionarios desde un archivo JSON"
                className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition active:scale-95"
              >
                <FileUp className="w-4 h-4 text-blue-400" />
                <span>Restaurar (JSON)</span>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportQuizzesFile}
                />
              </label>

              {/* Crear Cuestionario */}
              <button
                onClick={() => {
                  setEditingQuiz({
                    id: 'quiz-' + Date.now(),
                    title: '',
                    description: '',
                    category: 'General',
                    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
                    timePerQuestion: 20,
                    createdAt: new Date().toISOString(),
                    isPublished: true,
                    questions: [
                      {
                        id: 'q-' + Date.now() + '-1',
                        questionText: '',
                        timeLimit: 20,
                        pointsMultiplier: 1.0,
                        questionType: 'multiple_choice',
                        options: [
                          { id: 'opt-1', text: '', isCorrect: true, color: 'red', shape: 'triangle' },
                          { id: 'opt-2', text: '', isCorrect: false, color: 'blue', shape: 'diamond' },
                          { id: 'opt-3', text: '', isCorrect: false, color: 'yellow', shape: 'circle' },
                          { id: 'opt-4', text: '', isCorrect: false, color: 'green', shape: 'square' },
                        ],
                      },
                    ],
                  });
                  setIsEditorOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-kahoot-yellow hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs md:text-sm rounded-xl shadow-xl active:scale-95 transition"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Crear Cuestionario</span>
              </button>
            </div>
          </div>

          {/* Backup notification pill */}
          {jsonBackupStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs font-black text-emerald-300 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{jsonBackupStatus}</span>
            </motion.div>
          )}

          {/* Quizzes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map(quiz => (
              <div
                key={quiz.id}
                className="bg-kahoot-purple-dark/80 rounded-3xl border border-white/10 overflow-hidden shadow-xl flex flex-col justify-between group hover:border-kahoot-yellow/50 transition-all duration-300"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-black/40">
                    <img
                      src={quiz.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
                      alt={quiz.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] font-black text-amber-300 uppercase tracking-wider border border-white/10">
                      {quiz.category}
                    </span>
                    <span className="absolute top-3 right-3 px-3 py-1 bg-kahoot-purple-light/80 backdrop-blur-md rounded-full text-[11px] font-black text-white uppercase tracking-wider">
                      {quiz.questions.length} Preguntas
                    </span>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-black text-white mb-2 leading-snug">
                      {quiz.title}
                    </h3>
                    <p className="text-white/70 text-xs line-clamp-2 leading-relaxed">
                      {quiz.description || 'Sin descripción.'}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 flex items-center justify-between gap-2 border-t border-white/5 mt-4">
                  <span className="text-xs text-white/50 font-bold">
                    ⏱ {quiz.timePerQuestion || 20}s promedio
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Duplicar Cuestionario */}
                    <button
                      onClick={() => handleDuplicateQuiz(quiz)}
                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition active:scale-95"
                      title="Duplicar cuestionario"
                    >
                      <Files className="w-4 h-4 text-blue-300" />
                    </button>
                    {/* Editar */}
                    <button
                      onClick={() => {
                        setEditingQuiz(JSON.parse(JSON.stringify(quiz)));
                        setIsEditorOpen(true);
                      }}
                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition active:scale-95"
                      title="Editar cuestionario"
                    >
                      <Edit className="w-4 h-4 text-kahoot-yellow" />
                    </button>
                    {/* Eliminar */}
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="p-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-xl border border-red-500/20 transition active:scale-95"
                      title="Eliminar cuestionario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SUPABASE */}
      {activeTab === 'supabase' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-kahoot-purple-dark/80 rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-8 h-8 text-emerald-400" />
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                  Estado de Base de Datos Supabase
                </h3>
                <p className="text-white/70 text-sm font-semibold">
                  Almacena usuarios, rankings históricos y nuevos cuestionarios en la nube.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 mb-6 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-white/60 block">Conexión</span>
                <span className="font-extrabold text-base text-white">
                  {isSupabaseConfigured() ? (
                    <span className="text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Supabase Conectado y Listo
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-2">
                      ⚠️ Modo Local Activo (Sin credenciales en .env)
                    </span>
                  )}
                </span>
              </div>

              {isSupabaseConfigured() && (
                <button
                  onClick={handleSyncToSupabase}
                  className="px-4 py-2 bg-kahoot-yellow hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition active:scale-95"
                >
                  Sincronizar Cuestionarios
                </button>
              )}
            </div>

            {syncStatus && (
              <div className="p-3 bg-white/10 rounded-xl text-xs font-bold text-white mb-6">
                {syncStatus}
              </div>
            )}

            <div className="space-y-4 text-xs text-white/80">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Pasos para vincular tu proyecto a Supabase:
              </h4>
              <ol className="list-decimal list-inside space-y-2 font-semibold">
                <li>
                  Crea una cuenta en <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-kahoot-yellow underline">Supabase.com</a>.
                </li>
                <li>
                  Abre la pestaña <strong className="text-white">SQL Editor</strong> en Supabase y ejecuta el archivo <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">supabase/schema.sql</code>.
                </li>
                <li>
                  Agrega las variables en tu archivo <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">.env</code>:
                </li>
              </ol>

              <div className="bg-black/60 p-4 rounded-xl font-mono text-xs text-emerald-300 border border-white/10 select-all overflow-x-auto">
                VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
                <br />
                VITE_SUPABASE_ANON_KEY=tu_clave_anonima_publica_aqui
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUIZ EDITOR MODAL */}
      <AnimatePresence>
        {isEditorOpen && editingQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-kahoot-purple-dark border-2 border-white/20 rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-white"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">
                    {editingQuiz.title ? 'Editar Cuestionario' : 'Nuevo Cuestionario'}
                  </h3>
                  <span className="text-xs text-white/60 font-semibold">
                    Personaliza preguntas con imágenes subidas desde tu PC, enlaces web o galería rápida.
                  </span>
                </div>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 text-white/60 hover:text-white text-xl font-black"
                >
                  ✕
                </button>
              </div>

              {/* Quiz General Info Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                    Título del Cuestionario *
                  </label>
                  <input
                    type="text"
                    value={editingQuiz.title}
                    onChange={e => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                    placeholder="Ej. Desafío de Historia y Ciencias"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-kahoot-yellow"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={editingQuiz.category}
                    onChange={e => setEditingQuiz({ ...editingQuiz, category: e.target.value })}
                    placeholder="Ej. Entretenimiento, Educación..."
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-kahoot-yellow"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={editingQuiz.description}
                    onChange={e => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                    placeholder="Breve resumen de qué trata el cuestionario..."
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white font-semibold text-sm focus:outline-none focus:border-kahoot-yellow"
                  />
                </div>

                {/* Quiz Cover Image */}
                <div className="md:col-span-2 bg-black/30 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs uppercase font-bold text-white/80 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-kahoot-yellow" />
                      <span>Imagen de Portada del Cuestionario</span>
                    </label>
                    {editingQuiz.coverImage && (
                      <button
                        type="button"
                        onClick={() => setEditingQuiz({ ...editingQuiz, coverImage: '' })}
                        className="text-xs text-red-300 hover:text-white font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar Portada</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    {editingQuiz.coverImage ? (
                      <div className="relative w-full sm:w-48 h-28 rounded-xl overflow-hidden border-2 border-white/20 shadow-md flex-shrink-0">
                        <img
                          src={editingQuiz.coverImage}
                          alt="Portada"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full sm:w-48 h-28 rounded-xl border-2 border-dashed border-white/20 bg-black/20 flex flex-col items-center justify-center text-white/40 flex-shrink-0 text-xs">
                        <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                        <span>Sin Portada</span>
                      </div>
                    )}

                    <div className="flex-1 w-full space-y-2">
                      <div className="flex gap-2">
                        <label className="cursor-pointer px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center gap-1.5 active:scale-95">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Subir desde PC</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleCoverImageChange(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>

                      <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                        <LinkIcon className="w-3.5 h-3.5 text-white/40" />
                        <input
                          type="text"
                          value={editingQuiz.coverImage || ''}
                          onChange={e => setEditingQuiz({ ...editingQuiz, coverImage: e.target.value })}
                          placeholder="O pega un enlace de imagen (https://...)"
                          className="w-full bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black uppercase text-amber-300">
                    Preguntas ({editingQuiz.questions.length})
                  </h4>

                  <button
                    onClick={() => {
                      const newQuestion: Question = {
                        id: 'q-' + Date.now(),
                        questionText: '',
                        timeLimit: 20,
                        pointsMultiplier: 1.0,
                        questionType: 'multiple_choice',
                        options: [
                          { id: 'opt-' + Date.now() + '-1', text: '', isCorrect: true, color: 'red', shape: 'triangle' },
                          { id: 'opt-' + Date.now() + '-2', text: '', isCorrect: false, color: 'blue', shape: 'diamond' },
                          { id: 'opt-' + Date.now() + '-3', text: '', isCorrect: false, color: 'yellow', shape: 'circle' },
                          { id: 'opt-' + Date.now() + '-4', text: '', isCorrect: false, color: 'green', shape: 'square' },
                        ],
                      };
                      setEditingQuiz({
                        ...editingQuiz,
                        questions: [...editingQuiz.questions, newQuestion],
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Pregunta</span>
                  </button>
                </div>

                {editingQuiz.questions.map((ques, qIdx) => (
                  <div
                    key={ques.id}
                    className="bg-black/30 p-5 rounded-3xl border border-white/10 space-y-4"
                  >
                    {/* Question Header & Type Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-kahoot-yellow px-2.5 py-1 bg-black/40 rounded-lg">
                          Pregunta #{qIdx + 1}
                        </span>
                        <span className="text-xs text-white/60 font-bold uppercase">
                          Tipo:
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {editingQuiz.questions.length > 1 && (
                          <button
                            onClick={() => {
                              const updated = editingQuiz.questions.filter((_, i) => i !== qIdx);
                              setEditingQuiz({ ...editingQuiz, questions: updated });
                            }}
                            className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 bg-red-500/10 rounded-lg"
                          >
                            Eliminar Pregunta
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Type Choice Tabs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuestionTypeChange(qIdx, 'multiple_choice')}
                        className={`p-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                          ques.questionType === 'multiple_choice'
                            ? 'bg-kahoot-yellow text-black shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-white/70'
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Opción Múltiple</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuestionTypeChange(qIdx, 'true_false')}
                        className={`p-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                          ques.questionType === 'true_false'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-white/70'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Verdadero / Falso</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuestionTypeChange(qIdx, 'puzzle')}
                        className={`p-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                          ques.questionType === 'puzzle'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-white/70'
                        }`}
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Puzzle (Ordenar)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuestionTypeChange(qIdx, 'type_answer')}
                        className={`p-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                          ques.questionType === 'type_answer'
                            ? 'bg-amber-500 text-black shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-white/70'
                        }`}
                      >
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>Escribir Respuesta</span>
                      </button>
                    </div>

                    {/* Question Text, Time Limit & Multiplier */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                      <div className="md:col-span-8">
                        <label className="text-[11px] font-bold text-white/60 block mb-1">
                          Texto de la Pregunta *
                        </label>
                        <input
                          type="text"
                          placeholder="Escribe la pregunta aquí..."
                          value={ques.questionText}
                          onChange={e => {
                            const updated = [...editingQuiz.questions];
                            updated[qIdx].questionText = e.target.value;
                            setEditingQuiz({ ...editingQuiz, questions: updated });
                          }}
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-kahoot-yellow"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-white/60 block mb-1">
                          Tiempo Límite
                        </label>
                        <select
                          value={ques.timeLimit}
                          onChange={e => {
                            const updated = [...editingQuiz.questions];
                            updated[qIdx].timeLimit = Number(e.target.value);
                            setEditingQuiz({ ...editingQuiz, questions: updated });
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-kahoot-yellow"
                        >
                          <option value={10}>10 seg</option>
                          <option value={15}>15 seg</option>
                          <option value={20}>20 seg</option>
                          <option value={30}>30 seg</option>
                          <option value={60}>60 seg</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-white/60 block mb-1">
                          Puntaje
                        </label>
                        <select
                          value={ques.pointsMultiplier}
                          onChange={e => {
                            const updated = [...editingQuiz.questions];
                            updated[qIdx].pointsMultiplier = Number(e.target.value);
                            setEditingQuiz({ ...editingQuiz, questions: updated });
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-kahoot-yellow"
                        >
                          <option value={1.0}>1x Estándar</option>
                          <option value={1.5}>1.5x Plus</option>
                          <option value={2.0}>2x Doble</option>
                          <option value={0}>0x Sin puntos</option>
                        </select>
                      </div>
                    </div>

                    {/* IMAGE UPLOADER SECTION FOR THIS QUESTION (KAHOOT STYLE) */}
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4" />
                          <span>Imagen de la Pregunta (Estilo Kahoot)</span>
                        </label>

                        {ques.imageUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...editingQuiz.questions];
                              updated[qIdx].imageUrl = '';
                              setEditingQuiz({ ...editingQuiz, questions: updated });
                            }}
                            className="text-xs text-red-300 hover:text-white font-bold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar Imagen</span>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 items-center">
                        {ques.imageUrl ? (
                          <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg flex-shrink-0 bg-black/60">
                            <img
                              src={ques.imageUrl}
                              alt="Vista previa"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full sm:w-44 h-28 rounded-xl border-2 border-dashed border-white/20 bg-black/30 flex flex-col items-center justify-center text-white/40 flex-shrink-0 text-xs">
                            <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                            <span>Sin imagen</span>
                          </div>
                        )}

                        <div className="flex-1 w-full space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="cursor-pointer px-4 py-2 bg-kahoot-purple hover:bg-kahoot-purple-light text-white font-black text-xs uppercase tracking-wider rounded-xl shadow border border-white/20 transition flex items-center gap-2 active:scale-95">
                              <Upload className="w-4 h-4" />
                              <span>Subir Imagen desde tu PC</span>
                              <input
                                ref={el => {
                                  fileInputRefs.current[ques.id] = el;
                                }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e =>
                                  handleImageFileChange(qIdx, e.target.files?.[0] || null)
                                }
                              />
                            </label>

                            <span className="text-xs text-white/40 font-bold">o</span>

                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[11px] text-white/50 font-bold mr-1">
                                Galería rápida:
                              </span>
                              {PRESET_IMAGES.slice(0, 4).map(preset => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...editingQuiz.questions];
                                    updated[qIdx].imageUrl = preset.url;
                                    setEditingQuiz({ ...editingQuiz, questions: updated });
                                  }}
                                  className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition flex items-center gap-1"
                                  title={preset.name}
                                >
                                  <span>{preset.icon}</span>
                                  <span className="hidden lg:inline">{preset.name.split('/')[0]}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-xl border border-white/10 text-xs">
                            <LinkIcon className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                            <input
                              type="text"
                              value={ques.imageUrl || ''}
                              onChange={e => {
                                const updated = [...editingQuiz.questions];
                                updated[qIdx].imageUrl = e.target.value;
                                setEditingQuiz({ ...editingQuiz, questions: updated });
                              }}
                              placeholder="O escribe una URL de imagen (https://...)"
                              className="w-full bg-transparent text-white placeholder-white/30 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DYNAMIC OPTIONS EDITOR BASED ON QUESTION TYPE */}

                    {/* 1. Multiple Choice Options */}
                    {ques.questionType === 'multiple_choice' && (
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-bold text-white/70 block">
                          Opciones (Haz clic en la palomita verde ✓ para marcar la respuesta correcta):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {ques.options.map((opt, optIdx) => {
                            const colorBgs = {
                              red: 'border-l-4 border-l-red-500',
                              blue: 'border-l-4 border-l-blue-500',
                              yellow: 'border-l-4 border-l-yellow-500',
                              green: 'border-l-4 border-l-green-500',
                            }[opt.color];

                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-white/10 ${colorBgs}`}
                              >
                                <KahootShapeIcon shape={opt.shape} size={20} className="text-white/80" />
                                <input
                                  type="text"
                                  placeholder={`Opción ${optIdx + 1}...`}
                                  value={opt.text}
                                  onChange={e => {
                                    const updated = [...editingQuiz.questions];
                                    updated[qIdx].options[optIdx].text = e.target.value;
                                    setEditingQuiz({ ...editingQuiz, questions: updated });
                                  }}
                                  className="flex-1 bg-transparent text-white font-semibold text-xs focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...editingQuiz.questions];
                                    updated[qIdx].options.forEach((o, i) => {
                                      o.isCorrect = i === optIdx;
                                    });
                                    setEditingQuiz({ ...editingQuiz, questions: updated });
                                  }}
                                  title={opt.isCorrect ? 'Respuesta correcta' : 'Marcar como correcta'}
                                  className={`p-1.5 rounded-lg text-xs font-black transition ${
                                    opt.isCorrect
                                      ? 'bg-green-500 text-white shadow'
                                      : 'bg-white/10 text-white/40 hover:text-white'
                                  }`}
                                >
                                  ✓
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. True / False Options */}
                    {ques.questionType === 'true_false' && (
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-bold text-white/70 block">
                          Selecciona cuál es la respuesta correcta para esta afirmación:
                        </span>
                        <div className="grid grid-cols-2 gap-4">
                          {ques.options.map((opt, optIdx) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                const updated = [...editingQuiz.questions];
                                updated[qIdx].options.forEach((o, i) => {
                                  o.isCorrect = i === optIdx;
                                });
                                setEditingQuiz({ ...editingQuiz, questions: updated });
                              }}
                              className={`p-4 rounded-2xl flex items-center justify-between border-2 transition ${
                                opt.isCorrect
                                  ? 'bg-white/20 border-white ring-4 ring-green-400 font-black'
                                  : 'bg-black/30 border-white/10 opacity-60 font-semibold'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <KahootShapeIcon shape={opt.shape} size={24} />
                                <span className="text-sm uppercase tracking-wider">{opt.text}</span>
                              </div>
                              {opt.isCorrect && (
                                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-black">
                                  CORRECTA
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Puzzle / Ordering Sequence */}
                    {ques.questionType === 'puzzle' && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300 block">
                            Ingresa los elementos en el ORDEN CORRECTO (1° al 4°). Al jugar, el sistema los mezclará automáticamente:
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          {ques.options.map((opt, optIdx) => {
                            const shapes: Array<'triangle' | 'diamond' | 'circle' | 'square'> = ['triangle', 'diamond', 'circle', 'square'];
                            const colors: Array<'red' | 'blue' | 'yellow' | 'green'> = ['red', 'blue', 'yellow', 'green'];
                            const shape = shapes[optIdx % 4];
                            const color = colors[optIdx % 4];

                            return (
                              <div
                                key={opt.id}
                                className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/10"
                              >
                                <span className="w-8 h-8 rounded-xl bg-kahoot-yellow text-black font-black flex items-center justify-center text-sm shadow">
                                  #{optIdx + 1}
                                </span>
                                <KahootShapeIcon shape={shape} size={22} className="text-white/80" />
                                <input
                                  type="text"
                                  placeholder={`Elemento o paso número ${optIdx + 1}...`}
                                  value={opt.text}
                                  onChange={e => {
                                    const updated = [...editingQuiz.questions];
                                    updated[qIdx].options[optIdx].text = e.target.value;
                                    updated[qIdx].options[optIdx].orderIndex = optIdx;
                                    updated[qIdx].options[optIdx].shape = shape;
                                    updated[qIdx].options[optIdx].color = color;
                                    updated[qIdx].correctOrder = updated[qIdx].options.map(o => o.id);
                                    setEditingQuiz({ ...editingQuiz, questions: updated });
                                  }}
                                  className="flex-1 bg-transparent text-white font-bold text-sm focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 4. Type Answer Open Text */}
                    {ques.questionType === 'type_answer' && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-xs font-bold text-amber-300 block mb-1">
                            Respuesta(s) Aceptada(s) (separadas por comas):
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. 1989, el año 1989, en 1989"
                            value={(ques.acceptedAnswers || []).join(', ')}
                            onChange={e => {
                              const updated = [...editingQuiz.questions];
                              const parts = e.target.value
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean);
                              updated[qIdx].acceptedAnswers = parts.length > 0 ? parts : [e.target.value.trim()];
                              setEditingQuiz({ ...editingQuiz, questions: updated });
                            }}
                            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-kahoot-yellow"
                          />
                          <p className="text-[11px] text-white/50 mt-1 font-semibold">
                            El sistema compara sin distinción de mayúsculas/minúsculas ni espacios iniciales.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10 mt-8">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!editingQuiz.title.trim()) {
                      alert('Por favor ingresa un título para el cuestionario.');
                      return;
                    }
                    await quizService.saveQuiz(editingQuiz);
                    setIsEditorOpen(false);
                    await loadData();
                  }}
                  className="px-6 py-3 rounded-xl bg-kahoot-yellow hover:bg-amber-400 text-black font-black uppercase text-sm shadow-xl active:scale-95 transition"
                >
                  Guardar Cuestionario
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
