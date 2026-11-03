import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trophy,
  Users,
  Search,
  Download,
  FileText,
  Trash2,
  Plus,
  Edit,
  Flame,
  CheckCircle2,
  Database,
  Lock,
  Unlock,
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
  Files,
  Share2,
  AlertTriangle,
  History,
  Eye,
  BarChart3,
  Award,
  Calendar,
  Check,
  Clock,
  Sliders,
  ChevronUp,
  XCircle,
  EyeOff,
  Building2,
  Briefcase,
  Smartphone,
  FileSpreadsheet,
  UserCheck,
  UserX,
  Key,
  KeyRound,
  Sparkles,
  UserPlus
} from 'lucide-react';
import type { Participant, Quiz, Question, QuestionType, UserAccount } from '../types/quiz';
import { quizService, generateUUID, DEFAULT_DEPARTMENTS, DEFAULT_EXPLANATIONS, type ExamSettings, type QuestionAnalytics, type DetailedParticipantAnswer } from '../services/quizService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { authService } from '../services/authService';
import { CINEPOLIS_QUIZ_TEMPLATES, instantiateQuizFromTemplate, type QuizTemplateDefinition } from '../utils/quizTemplates';
import { processImageUpload, PRESET_IMAGES } from '../utils/imageUtils';
import { exportRankingsToPDF, exportDiplomaPDF, exportTop3Diplomas, exportQuestionAnalyticsPDF } from '../utils/pdfExport';
import { exportRankingsToExcel } from '../utils/excelExport';
import { getHardwareHash, maskName } from '../utils/security';
import { InteractiveMedal3D } from './CinemaEffects';
import { KahootShapeIcon } from './KahootShapes';
import { ShareQuizModal } from './ShareQuizModal';

interface AdminViewProps {
  onBackToHome: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onBackToHome }) => {
  // Authentication State: Si el usuario ya inició sesión con rol admin, se autentica directamente
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return authService.isAdmin() || sessionStorage.getItem('kahoot_admin_auth') === 'true';
  });
  const [passcode, setPasscode] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'rankings' | 'analytics' | 'controls' | 'quizzes' | 'users' | 'server'>('rankings');

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [rankings, setRankings] = useState<Participant[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [privacyMode, setPrivacyMode] = useState<'normal' | 'surname' | 'avatar'>('normal');
  const [showBranchBreakdown, setShowBranchBreakdown] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [jsonBackupStatus, setJsonBackupStatus] = useState<string>('');
  const [settingsSaveMessage, setSettingsSaveMessage] = useState<string>('');

  // Estados para reportes analíticos y candado de examen
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
  const [examSettings, setExamSettings] = useState<ExamSettings>({
    isExamOpen: true,
    closeDate: undefined,
    preventRetries: false,
    closeMessage: 'Esta evaluación se encuentra cerrada por el administrador.',
    shuffleQuestions: true,
    branches: [],
    departments: DEFAULT_DEPARTMENTS,
    maxAttemptsPerUser: 1,
  });
  const [branchesInput, setBranchesInput] = useState<string>('');

  // Estados para Gestión de Usuarios & Accesos Cinépolis
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [resettingUserPassword, setResettingUserPassword] = useState<{ id: string; name: string } | null>(null);
  const [newTempPassword, setNewTempPassword] = useState<string>('');
  const [userActionMessage, setUserActionMessage] = useState<string>('');
  const [showTemplatesModal, setShowTemplatesModal] = useState<boolean>(false);

  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [sharingQuiz, setSharingQuiz] = useState<Quiz | null>(null);
  const [isSavingQuiz, setIsSavingQuiz] = useState<boolean>(false);
  const [savedDraft, setSavedDraft] = useState<Quiz | null>(() => {
    try {
      const d = localStorage.getItem('kahoot_editor_draft');
      return d ? JSON.parse(d) : null;
    } catch {
      return null;
    }
  });

  // Guardar borrador en tiempo real mientras el admin edita para evitar pérdidas accidentales
  useEffect(() => {
    if (editingQuiz && isEditorOpen) {
      localStorage.setItem('kahoot_editor_draft', JSON.stringify(editingQuiz));
    }
  }, [editingQuiz, isEditorOpen]);

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

  // Cierre de sesión automático tras 15 minutos de inactividad en el panel de Admin
  useEffect(() => {
    if (!isAuthenticated) return;
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutos
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('kahoot_admin_auth');
        setAuthError('Sesión cerrada automáticamente tras 15 minutos de inactividad por seguridad.');
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allQuizzes = await quizService.getQuizzes();
      setQuizzes(allQuizzes);

      const allRankings = await quizService.getRankings(
        selectedQuizId === 'all' ? undefined : selectedQuizId
      );
      setRankings(allRankings);

      // Cargar analíticas de preguntas y ajustes del cuestionario seleccionado
      const targetQuiz = selectedQuizId === 'all'
        ? allQuizzes.find(q => q.id === 'f3f7aa07-4389-4769-a162-3fb8b989bfc0') || allQuizzes[0]
        : allQuizzes.find(q => q.id === selectedQuizId);

      if (targetQuiz) {
        const analytics = await quizService.getQuestionAnalytics(targetQuiz);
        setQuestionAnalytics(analytics);
        const settings = quizService.getExamSettings(targetQuiz.id);
        const loadedBranches = targetQuiz.branches || settings.branches || [];
        setExamSettings({
          isExamOpen: targetQuiz.isExamOpen ?? settings.isExamOpen ?? true,
          closeDate: targetQuiz.closeDate || settings.closeDate,
          preventRetries: targetQuiz.preventRetries ?? settings.preventRetries ?? false,
          closeMessage: targetQuiz.closeMessage || settings.closeMessage,
          shuffleQuestions: targetQuiz.shuffleQuestions ?? settings.shuffleQuestions ?? true,
          branches: loadedBranches,
          departments: targetQuiz.departments || settings.departments || DEFAULT_DEPARTMENTS,
          maxAttemptsPerUser: targetQuiz.maxAttemptsPerUser ?? settings.maxAttemptsPerUser ?? 1,
        });
        setBranchesInput(loadedBranches.join(', '));
      }

      // Cargar lista de usuarios registrados
      const allUsers = await authService.getUsers();
      setUsersList(allUsers);
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
    if (passcode.trim() === 'Mike040903') {
      setIsAuthenticated(true);
      sessionStorage.setItem('kahoot_admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Contraseña incorrecta. Por favor intenta de nuevo.');
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
      id: generateUUID(),
      title: `${quiz.title} (Copia)`,
      createdAt: new Date().toISOString(),
    };
    await quizService.saveQuiz(duplicated);
    await loadData();
  };

  // Export to PDF Oficial
  const handleExportPDF = () => {
    if (filteredRankings.length === 0) return;
    const currentQuiz = quizzes.find(item => item.id === selectedQuizId);
    const quizTitle = currentQuiz ? currentQuiz.title : 'Todos los Cuestionarios (General)';
    exportRankingsToPDF({
      quizTitle,
      rankings: filteredRankings,
      isFirstAttemptOnly,
      attemptsCountMap,
    });
  };

  // Exportar diplomas oficiales del Top 3 (1°, 2° y 3° lugar)
  const handleExportTop3Diplomas = () => {
    if (filteredRankings.length === 0) return;
    const currentQuiz = quizzes.find(item => item.id === selectedQuizId) || quizzes[0];
    const quizTitle = currentQuiz ? currentQuiz.title : 'Cinepolis Máster ¿Qué tanto sabemos?';
    exportTop3Diplomas(filteredRankings, quizTitle);
  };

  // Exportar diploma individual para un colaborador
  const handleExportSingleDiploma = (participant: Participant, rank: number) => {
    const currentQuiz = quizzes.find(item => item.id === participant.quizId) || quizzes[0];
    const quizTitle = currentQuiz ? currentQuiz.title : 'Cinepolis Máster ¿Qué tanto sabemos?';
    exportDiplomaPDF(participant, rank, quizTitle);
  };

  // Exportar a Excel (.xlsx) con pestañas de Ranking, Sucursales/Áreas y Preguntas
  const handleExportExcel = async () => {
    if (filteredRankings.length === 0) return;
    const currentQuiz = quizzes.find(item => item.id === selectedQuizId);
    const quizTitle = currentQuiz ? currentQuiz.title : 'Cinepolis Master ¿Que tanto sabemos?';
    await exportRankingsToExcel({
      quizTitle,
      rankings: filteredRankings,
      questionAnalytics,
      attemptsCountMap,
      deviceUsersMap,
    });
  };

  // Guardar configuración y candados de examen (abrir/cerrar, fecha límite, reintentos, orden aleatorio y sucursales)
  const handleSaveExamSettings = async () => {
    const targetQuizId = selectedQuizId === 'all'
      ? (quizzes.find(q => q.id === 'f3f7aa07-4389-4769-a162-3fb8b989bfc0')?.id || quizzes[0]?.id || 'f3f7aa07-4389-4769-a162-3fb8b989bfc0')
      : selectedQuizId;

    const parsedBranches = branchesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const updatedSettings: ExamSettings = {
      ...examSettings,
      branches: parsedBranches,
    };

    setIsLoading(true);
    try {
      await quizService.saveExamSettings(targetQuizId, updatedSettings);
      setExamSettings(updatedSettings);
      setSettingsSaveMessage('¡Ajustes de examen y candados guardados exitosamente!');
      await loadData();
      setTimeout(() => setSettingsSaveMessage(''), 4000);
    } catch (err: any) {
      alert(`Error al guardar configuración: ${err.message || 'Desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Acciones Administrativas de Usuarios Cinépolis
  const handleUpdateUserData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const res = await authService.updateUser(editingUser.id, {
      name: editingUser.name,
      fullName: editingUser.name,
      email: editingUser.email,
      employeeNumber: editingUser.employeeNumber,
      branch: editingUser.branch,
      department: editingUser.department,
      role: editingUser.role,
    });
    if (res.success) {
      setUserActionMessage('¡Datos de usuario actualizados exitosamente!');
      setEditingUser(null);
      const updated = await authService.getUsers();
      setUsersList(updated);
      setTimeout(() => setUserActionMessage(''), 4000);
    } else {
      alert(res.error || 'Error al actualizar usuario');
    }
  };

  const handleToggleUserRole = async (user: UserAccount) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`¿Deseas cambiar el rol de ${user.name || user.nickname} a "${newRole === 'admin' ? 'Administrador' : 'Colaborador'}"?`)) {
      return;
    }
    const res = await authService.updateUser(user.id, { role: newRole });
    if (res.success) {
      setUserActionMessage(`Rol de ${user.nickname} actualizado a ${newRole === 'admin' ? 'Administrador' : 'Colaborador'}.`);
      const updated = await authService.getUsers();
      setUsersList(updated);
      setTimeout(() => setUserActionMessage(''), 4000);
    } else {
      alert(res.error || 'Error al cambiar rol');
    }
  };

  const handleToggleUserStatus = async (user: UserAccount) => {
    const action = user.isActive ? 'suspender' : 'activar';
    if (!window.confirm(`¿Deseas ${action} la cuenta de ${user.name || user.nickname}?`)) return;
    const res = await authService.toggleUserStatus(user.id);
    if (res.success) {
      setUserActionMessage(`Cuenta de ${user.nickname} ${res.isActive ? 'activada' : 'suspendida'}.`);
      const updated = await authService.getUsers();
      setUsersList(updated);
      setTimeout(() => setUserActionMessage(''), 4000);
    }
  };

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUserPassword || !newTempPassword.trim()) return;
    if (newTempPassword.length < 6) {
      alert('La contraseña temporal debe tener al menos 6 caracteres.');
      return;
    }
    const res = await authService.resetUserPassword(resettingUserPassword.id, newTempPassword.trim());
    if (res.success) {
      setUserActionMessage(`¡Contraseña de ${resettingUserPassword.name} restablecida exitosamente!`);
      setResettingUserPassword(null);
      setNewTempPassword('');
      setTimeout(() => setUserActionMessage(''), 4000);
    } else {
      alert(res.error || 'Error al restablecer contraseña');
    }
  };

  const handleDeleteUserAccount = async (user: UserAccount) => {
    if (!window.confirm(`¿Estás seguro de ELIMINAR permanentemente la cuenta de ${user.name || user.nickname} (${user.nickname})? Esta acción no se puede deshacer.`)) {
      return;
    }
    const res = await authService.deleteUser(user.id);
    if (res.success) {
      setUserActionMessage(`Cuenta de ${user.nickname} eliminada.`);
      const updated = await authService.getUsers();
      setUsersList(updated);
      setTimeout(() => setUserActionMessage(''), 4000);
    } else {
      alert(res.error || 'Error al eliminar usuario');
    }
  };

  const handleClearUserQuizAttempts = async (nickname: string) => {
    const targetQuizId = selectedQuizId === 'all'
      ? (quizzes.find(q => q.id === 'f3f7aa07-4389-4769-a162-3fb8b989bfc0')?.id || quizzes[0]?.id || '')
      : selectedQuizId;
    if (!targetQuizId) return;

    if (window.confirm(`¿Habilitar un nuevo intento para "${nickname}"? Se reiniciarán sus registros de este examen para que pueda presentarlo nuevamente.`)) {
      await quizService.clearParticipantAttempts(targetQuizId, nickname);
      await loadData();
      setUserActionMessage(`Nuevo intento habilitado para ${nickname}.`);
      setTimeout(() => setUserActionMessage(''), 4000);
    }
  };

  const handleSyncToServer = async () => {
    setSyncStatus('Sincronizando con el servidor central...');
    const res = await quizService.syncSeedToSupabase();
    setSyncStatus(res.message);
  };
  const handleExportCSV = () => {
    if (filteredRankings.length === 0) return;

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
      setJsonBackupStatus('¡Rankings eliminados correctamente!');
      setTimeout(() => setJsonBackupStatus(''), 4000);
    }
  };


  const handleDeleteQuiz = async (quizId: string) => {
    if (window.confirm('¿Deseas eliminar este cuestionario? Se eliminarán también sus preguntas asociadas.')) {
      await quizService.deleteQuiz(quizId);
      await loadData();
      setJsonBackupStatus('¡Cuestionario eliminado correctamente!');
      setTimeout(() => setJsonBackupStatus(''), 4000);
    }
  };

  const handleQuestionTypeChange = (qIdx: number, newType: QuestionType) => {
    if (!editingQuiz) return;
    const updated = [...editingQuiz.questions];
    const ques = updated[qIdx];
    ques.questionType = newType;

    if (newType === 'multiple_choice') {
      ques.options = [
        { id: generateUUID(), text: ques.options[0]?.text || '', isCorrect: true, color: 'red', shape: 'triangle', orderIndex: 0 },
        { id: generateUUID(), text: ques.options[1]?.text || '', isCorrect: false, color: 'blue', shape: 'diamond', orderIndex: 1 },
        { id: generateUUID(), text: ques.options[2]?.text || '', isCorrect: false, color: 'yellow', shape: 'circle', orderIndex: 2 },
        { id: generateUUID(), text: ques.options[3]?.text || '', isCorrect: false, color: 'green', shape: 'square', orderIndex: 3 },
      ];
      ques.correctOrder = undefined;
      ques.acceptedAnswers = undefined;
    } else if (newType === 'true_false') {
      ques.options = [
        { id: generateUUID(), text: 'VERDADERO', isCorrect: true, color: 'blue', shape: 'diamond', orderIndex: 0 },
        { id: generateUUID(), text: 'FALSO', isCorrect: false, color: 'red', shape: 'triangle', orderIndex: 1 },
      ];
      ques.correctOrder = undefined;
      ques.acceptedAnswers = undefined;
    } else if (newType === 'puzzle') {
      const puz1 = generateUUID();
      const puz2 = generateUUID();
      const puz3 = generateUUID();
      const puz4 = generateUUID();
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

  // Modo Anti-trampas: Tomar solo el primer intento registrado por participante
  const [isFirstAttemptOnly, setIsFirstAttemptOnly] = useState<boolean>(true);

  // Normalizador para agrupar intentos del mismo usuario sin importar mayúsculas/espacios/acentos
  const normalizePlayerName = (name: string) =>
    (name || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');

  // Mapear conteo total de intentos por persona para identificar repeticiones
  const attemptsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    rankings.forEach(p => {
      const key = normalizePlayerName(p.nickname);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [rankings]);

  // Mapear Huella Digital del Dispositivo (Device Fingerprint) -> Nombres distintos que contestaron desde el mismo equipo
  const deviceUsersMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    rankings.forEach(p => {
      const hw = getHardwareHash(p.deviceId);
      if (!hw) return;
      if (!map.has(hw)) map.set(hw, new Set());
      map.get(hw)!.add(normalizePlayerName(p.nickname));
    });
    return map;
  }, [rankings]);

  // Lista procesada según el modo Anti-trampas (primer intento cronológico)
  const displayRankings = useMemo(() => {
    if (!isFirstAttemptOnly) {
      return [...rankings].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    }

    // Ordenar cronológicamente ascendente para asegurar tomar el PRIMER intento registrado
    const sortedChronological = [...rankings].sort((a, b) => {
      const timeA = new Date(a.completedAt).getTime();
      const timeB = new Date(b.completedAt).getTime();
      return timeA - timeB;
    });

    const firstAttemptsMap = new Map<string, Participant>();
    sortedChronological.forEach(p => {
      const key = normalizePlayerName(p.nickname);
      if (!firstAttemptsMap.has(key)) {
        firstAttemptsMap.set(key, p);
      }
    });

    return Array.from(firstAttemptsMap.values()).sort((a, b) => {
      if ((b.totalScore || 0) !== (a.totalScore || 0)) {
        return (b.totalScore || 0) - (a.totalScore || 0);
      }
      return (b.accuracyPercentage || 0) - (a.accuracyPercentage || 0);
    });
  }, [rankings, isFirstAttemptOnly]);

  // Sucursales y Áreas disponibles en los registros actuales
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    displayRankings.forEach(p => {
      if (p.branch && p.branch.trim()) set.add(p.branch.trim());
    });
    return Array.from(set).sort();
  }, [displayRankings]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>(DEFAULT_DEPARTMENTS);
    displayRankings.forEach(p => {
      if (p.department && p.department.trim()) set.add(p.department.trim());
    });
    return Array.from(set);
  }, [displayRankings]);

  // Promedios por Sucursal y por Área / Departamento
  const { branchSummaries, deptSummaries } = useMemo(() => {
    const bMap = new Map<string, { count: number; scoreSum: number; accSum: number }>();
    const dMap = new Map<string, { count: number; scoreSum: number; accSum: number }>();

    displayRankings.forEach(p => {
      const bKey = (p.branch || '').trim();
      if (bKey) {
        const cur = bMap.get(bKey) || { count: 0, scoreSum: 0, accSum: 0 };
        cur.count += 1;
        cur.scoreSum += p.totalScore || 0;
        cur.accSum += p.accuracyPercentage || 0;
        bMap.set(bKey, cur);
      }

      const dKey = (p.department || '').trim();
      if (dKey) {
        const cur = dMap.get(dKey) || { count: 0, scoreSum: 0, accSum: 0 };
        cur.count += 1;
        cur.scoreSum += p.totalScore || 0;
        cur.accSum += p.accuracyPercentage || 0;
        dMap.set(dKey, cur);
      }
    });

    const branchList = Array.from(bMap.entries())
      .map(([name, s]) => ({
        name,
        count: s.count,
        avgScore: Math.round(s.scoreSum / s.count),
        avgAccuracy: Math.round(s.accSum / s.count),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const deptList = Array.from(dMap.entries())
      .map(([name, s]) => ({
        name,
        count: s.count,
        avgScore: Math.round(s.scoreSum / s.count),
        avgAccuracy: Math.round(s.accSum / s.count),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    return { branchSummaries: branchList, deptSummaries: deptList };
  }, [displayRankings]);

  const filteredRankings = displayRankings.filter(p => {
    const matchesSearch =
      p.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.branch || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch =
      selectedBranchFilter === 'all' || (p.branch || '').trim() === selectedBranchFilter;
    const matchesDept =
      selectedDeptFilter === 'all' || (p.department || '').trim() === selectedDeptFilter;
    return matchesSearch && matchesBranch && matchesDept;
  });

  // Estado para el modal de inspección de historial de intentos de un participante
  const [inspectingPlayerName, setInspectingPlayerName] = useState<string | null>(null);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<Record<string, DetailedParticipantAnswer[]>>({});
  const [isLoadingAnswers, setIsLoadingAnswers] = useState<boolean>(false);

  // Lista de todos los intentos del participante seleccionado ordenados del 1° al último
  const inspectingAttempts = useMemo(() => {
    if (!inspectingPlayerName) return [];
    const norm = normalizePlayerName(inspectingPlayerName);
    return rankings
      .filter(p => normalizePlayerName(p.nickname) === norm)
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
  }, [inspectingPlayerName, rankings]);

  const loadAnswersForAttempt = async (attemptId: string) => {
    if (attemptAnswers[attemptId]) {
      setExpandedAttemptId(prev => prev === attemptId ? null : attemptId);
      return;
    }
    setExpandedAttemptId(attemptId);
    setIsLoadingAnswers(true);
    try {
      const selectedQuiz = quizzes.find(q => q.id === selectedQuizId) || quizzes[0];
      const details = await quizService.getParticipantAnswers(attemptId, selectedQuiz);
      setAttemptAnswers(prev => ({ ...prev, [attemptId]: details }));
    } catch (err) {
      console.warn('Error cargando respuestas del participante:', err);
    } finally {
      setIsLoadingAnswers(false);
    }
  };

  useEffect(() => {
    if (inspectingPlayerName && inspectingAttempts.length > 0) {
      const firstId = inspectingAttempts[0].id;
      loadAnswersForAttempt(firstId);
    }
  }, [inspectingPlayerName]);

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
                placeholder="Ingresa la contraseña..."
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

          <div className="mt-6 pt-6 border-t border-white/10 text-xs text-white/50 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-300" />
            <span>Acceso seguro protegido para administradores</span>
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
          <div className="flex items-center gap-2 mt-2.5">
            {isSupabaseConfigured() ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                <Database className="w-3.5 h-3.5" /> Servidor en la Nube Conectado y Listo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                <Database className="w-3.5 h-3.5" /> Modo Local Protegido
              </span>
            )}
          </div>
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
      <div className="flex flex-wrap gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/10 mb-8 max-w-5xl">
        <button
          onClick={() => setActiveTab('rankings')}
          className={`flex-1 min-w-[130px] py-3 px-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'rankings'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Rankings</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-w-[130px] py-3 px-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Preguntas Difíciles</span>
        </button>

        <button
          onClick={() => setActiveTab('controls')}
          className={`flex-1 min-w-[130px] py-3 px-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'controls'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Candado & Reglas</span>
        </button>

        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex-1 min-w-[130px] py-3 px-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'quizzes'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Cuestionarios</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 min-w-[130px] py-3 px-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'users'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios & Accesos</span>
        </button>

        <button
          onClick={() => setActiveTab('server')}
          className={`flex-1 min-w-[130px] py-3 px-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            activeTab === 'server'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Sincronización</span>
        </button>
      </div>

      {/* TAB 1: RANKINGS */}
      {activeTab === 'rankings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-white/10 shadow-lg">
              <span className="text-xs uppercase font-bold text-white/60">
                {isFirstAttemptOnly ? 'Participantes Únicos' : 'Total Evaluaciones'}
              </span>
              <div className="text-3xl font-black text-white mt-1">{displayRankings.length}</div>
              <p className="text-[11px] text-white/40 mt-1">
                {isFirstAttemptOnly ? `${rankings.length} intentos recibidos en total` : 'Sin filtro de intentos'}
              </p>
            </div>

            <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-white/10 shadow-lg">
              <span className="text-xs uppercase font-bold text-white/60">
                Puntaje Récord {isFirstAttemptOnly ? '(1er Intento)' : ''}
              </span>
              <div className="text-3xl font-black text-kahoot-yellow mt-1">
                {displayRankings.length > 0
                  ? Math.max(...displayRankings.map(r => r.totalScore)).toLocaleString()
                  : 0}
              </div>
              <p className="text-[11px] text-amber-300/70 mt-1 truncate">
                Líder: {displayRankings[0]?.nickname || 'N/A'}
              </p>
            </div>

            <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-white/10 shadow-lg">
              <span className="text-xs uppercase font-bold text-white/60">Precisión Promedio</span>
              <div className="text-3xl font-black text-green-400 mt-1">
                {displayRankings.length > 0
                  ? Math.round(
                      displayRankings.reduce((acc, curr) => acc + curr.accuracyPercentage, 0) /
                        displayRankings.length
                    )
                  : 0}
                %
              </div>
              <p className="text-[11px] text-white/40 mt-1">
                Promedio {isFirstAttemptOnly ? 'de primeros intentos' : 'general'}
              </p>
            </div>

            <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-white/60">Filtro Anti-trampas</span>
                <div className="flex items-center gap-2 mt-1">
                  <ShieldCheck className={`w-5 h-5 ${isFirstAttemptOnly ? 'text-emerald-400' : 'text-white/40'}`} />
                  <span className={`text-xl font-black ${isFirstAttemptOnly ? 'text-emerald-400' : 'text-white/50'}`}>
                    {isFirstAttemptOnly ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-white/40 mt-1">
                {isFirstAttemptOnly ? 'Solo 1 intento por persona' : 'Mostrando repeticiones'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 bg-kahoot-purple-dark/80 p-4 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <div className="relative">
                  <select
                    value={selectedQuizId}
                    onChange={e => setSelectedQuizId(e.target.value)}
                    className="px-3.5 py-2.5 pr-9 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-xs sm:text-sm appearance-none focus:outline-none focus:border-kahoot-yellow"
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

                {/* Filtro por Sucursal / Conjunto */}
                <div className="relative">
                  <select
                    value={selectedBranchFilter}
                    onChange={e => setSelectedBranchFilter(e.target.value)}
                    className="px-3.5 py-2.5 pr-8 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-xs sm:text-sm appearance-none focus:outline-none focus:border-kahoot-yellow"
                  >
                    <option value="all">🏢 Todas las Sucursales ({availableBranches.length})</option>
                    {availableBranches.map(b => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-white/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Filtro por Área / Departamento */}
                <div className="relative">
                  <select
                    value={selectedDeptFilter}
                    onChange={e => setSelectedDeptFilter(e.target.value)}
                    className="px-3.5 py-2.5 pr-8 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-xs sm:text-sm appearance-none focus:outline-none focus:border-kahoot-yellow"
                  >
                    <option value="all">🍿 Todas las Áreas</option>
                    {availableDepartments.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-white/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative flex-1 sm:w-52">
                  <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar nombre, cine o área..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 text-xs sm:text-sm font-semibold focus:outline-none focus:border-kahoot-yellow"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                {/* Botón Switch Modo Anti-trampas */}
                <button
                  type="button"
                  onClick={() => setIsFirstAttemptOnly(!isFirstAttemptOnly)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition border shadow-sm ${
                    isFirstAttemptOnly
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Al estar activo, si un usuario jugó varias veces solo se toma en cuenta su primer intento realizado"
                >
                  <ShieldCheck className={`w-4 h-4 ${isFirstAttemptOnly ? 'text-emerald-400' : 'text-white/40'}`} />
                  <span>{isFirstAttemptOnly ? '1er Intento' : 'Todos'}</span>
                </button>

                {/* Modo Proyección Segura (Privacidad) */}
                <button
                  type="button"
                  onClick={() =>
                    setPrivacyMode(prev =>
                      prev === 'normal' ? 'surname' : prev === 'surname' ? 'avatar' : 'normal'
                    )
                  }
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition border ${
                    privacyMode !== 'normal'
                      ? 'bg-blue-500/25 text-blue-200 border-blue-400/50'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                  title="Modo Proyección Segura: Oculta apellidos o anonimiza nombres para proyectar en sala sin exponer calificaciones bajas"
                >
                  {privacyMode === 'normal' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-blue-300" />}
                  <span>
                    {privacyMode === 'normal'
                      ? 'Proyección: Normal'
                      : privacyMode === 'surname'
                      ? 'Sin Apellidos'
                      : 'Modo Anónimo'}
                  </span>
                </button>

                {/* Botón Ver Ranking por Sucursal / Área */}
                <button
                  type="button"
                  onClick={() => setShowBranchBreakdown(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition border ${
                    showBranchBreakdown
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                  title="Ver promedios comparativos por Sucursal y por Área de Cinépolis"
                >
                  <Building2 className="w-4 h-4 text-amber-300" />
                  <span>Por Cine / Área</span>
                </button>

                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold border border-white/10 transition active:scale-95"
                  title="Recargar rankings en vivo"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-300' : ''}`} />
                </button>

                <button
                  onClick={handleExportPDF}
                  disabled={filteredRankings.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-black border border-red-400/30 transition shadow-lg active:scale-95"
                  title="Descargar reporte formal en PDF con podio y estadísticas"
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  disabled={filteredRankings.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-40 text-white rounded-xl text-xs font-black border border-emerald-400/30 transition shadow-lg active:scale-95"
                  title="Exportar base de datos completa en Excel (.xlsx) con pestañas de Participantes, Sucursales y Preguntas"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel (.xlsx)</span>
                </button>

                <button
                  onClick={handleExportTop3Diplomas}
                  disabled={filteredRankings.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-black rounded-xl text-xs font-black border border-amber-300/40 transition shadow-lg active:scale-95"
                  title="Generar y descargar diplomas de reconocimiento formal para el Top 3 (1°, 2° y 3° lugar)"
                >
                  <Award className="w-4 h-4 text-black" />
                  <span>Diplomas Top 3</span>
                </button>

                <button
                  onClick={handleClearRankings}
                  disabled={rankings.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600/30 hover:bg-red-600/50 disabled:opacity-40 text-red-200 rounded-xl text-xs font-bold border border-red-500/30 transition active:scale-95"
                  title="Borrar ranking de participantes"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desglose Comparativo por Sucursal y por Área */}
            {showBranchBreakdown && (
              <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-2.5">
                    <Building2 className="w-4 h-4" />
                    <span>Promedio por Sucursal / Conjunto ({branchSummaries.length})</span>
                  </h4>
                  {branchSummaries.length > 0 ? (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {branchSummaries.map((b, i) => (
                        <div key={b.name} className="flex items-center justify-between text-xs bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                          <span className="font-bold text-white truncate">
                            {i + 1}. {b.name} <span className="text-white/40 font-normal">({b.count} colab.)</span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-kahoot-yellow font-black">{b.avgScore.toLocaleString()} pts</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[10px]">
                              {b.avgAccuracy}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 py-3">
                      Los nuevos intentos que incluyan sucursal aparecerán comparados aquí.
                    </p>
                  )}
                </div>

                <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5 mb-2.5">
                    <Briefcase className="w-4 h-4" />
                    <span>Promedio por Área / Departamento ({deptSummaries.length})</span>
                  </h4>
                  {deptSummaries.length > 0 ? (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {deptSummaries.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between text-xs bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                          <span className="font-bold text-white truncate">
                            {i + 1}. {d.name} <span className="text-white/40 font-normal">({d.count} colab.)</span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-kahoot-yellow font-black">{d.avgScore.toLocaleString()} pts</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[10px]">
                              {d.avgAccuracy}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 py-3">
                      Los nuevos intentos que incluyan departamento (Taquilla, Dulcería, Spyral, etc.) aparecerán aquí.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-kahoot-purple-dark/80 rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-md">
            {filteredRankings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/20 text-[11px] uppercase font-black tracking-wider text-white/60">
                      <th className="py-4 px-4 text-center">Posición</th>
                      <th className="py-4 px-5">Jugador</th>
                      <th className="py-4 px-4 text-center">¿Hizo Trampa?</th>
                      <th className="py-4 px-5">Cuestionario</th>
                      <th className="py-4 px-5 text-right">Puntaje Total</th>
                      <th className="py-4 px-4 text-center">Aciertos</th>
                      <th className="py-4 px-4 text-center">Precisión</th>
                      <th className="py-4 px-4 text-center">Racha</th>
                      <th className="py-4 px-5 text-right">Fecha {isFirstAttemptOnly ? '(1er Intento)' : ''}</th>
                      <th className="py-4 px-4 text-center">Historial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-semibold text-sm">
                    {filteredRankings.map((p, index) => {
                      const quizInfo = quizzes.find(q => q.id === p.quizId);
                      const isTop3 = index < 3;
                      const badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                      const totalAttempts = attemptsCountMap.get(normalizePlayerName(p.nickname)) || 1;
                      const hwHash = getHardwareHash(p.deviceId);
                      const sharedDeviceUsers = hwHash ? deviceUsersMap.get(hwHash)?.size || 1 : 1;
                      const tabSwitches = p.tabSwitches || 0;
                      const hasSuspiciousActivity = totalAttempts > 1 || tabSwitches > 0 || sharedDeviceUsers > 1;

                      return (
                        <tr
                          key={p.id}
                          onClick={() => setInspectingPlayerName(p.nickname)}
                          className="hover:bg-white/10 transition-colors cursor-pointer group"
                          title="Haz clic para inspeccionar todos los intentos de este jugador"
                        >
                          <td className="py-4 px-4 text-center">
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
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{p.avatar || '🦊'}</span>
                              <div>
                                <span className="font-extrabold text-white text-base block group-hover:text-kahoot-yellow transition-colors">
                                  {maskName(p.nickname, privacyMode, index)}
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] text-white/40">
                                    {totalAttempts > 1 ? `${totalAttempts} intentos` : '1 intento'}
                                  </span>
                                  {p.branch && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                                      🏢 {p.branch}
                                    </span>
                                  )}
                                  {p.department && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                      🍿 {p.department}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {hasSuspiciousActivity ? (
                              <div className="flex flex-col items-center gap-1">
                                {totalAttempts > 1 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-500/20 text-red-300 border border-red-500/40">
                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                    <span>Reintento ({totalAttempts} int.)</span>
                                  </span>
                                )}
                                {tabSwitches > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40" title={`Salió de la pantalla ${tabSwitches} veces (${Math.round((p.timeAwayMs || 0) / 1000)}s fuera)`}>
                                    <EyeOff className="w-3 h-3 text-amber-400" />
                                    <span>{tabSwitches} cambio(s) pestaña</span>
                                  </span>
                                )}
                                {sharedDeviceUsers > 1 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/25 text-rose-200 border border-rose-400/50" title="Este mismo teléfono o PC se usó para contestar con múltiples nombres diferentes">
                                    <Smartphone className="w-3 h-3 text-rose-300" />
                                    <span>Disp. compartido ({sharedDeviceUsers})</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>NO (Limpio)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-5 max-w-xs truncate text-white/80">
                            {quizInfo?.title || 'Cuestionario General'}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <span className="font-black text-base text-kahoot-yellow">
                              {p.totalScore.toLocaleString()}
                            </span>
                            <span className="text-xs text-white/60 ml-1">pts</span>
                          </td>
                          <td className="py-4 px-4 text-center text-white/90 font-bold">
                            {p.correctAnswersCount} / {p.totalQuestionsCount}
                          </td>
                          <td className="py-4 px-4 text-center">
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
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex items-center gap-1 text-amber-300 font-extrabold">
                              <Flame className="w-4 h-4" />
                              <span>x{p.maxStreak}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-right text-xs text-white/50">
                            {new Date(p.completedAt).toLocaleDateString()} {new Date(p.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingPlayerName(p.nickname);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-kahoot-yellow hover:text-black text-white/80 text-xs font-bold transition group-hover:bg-white/20"
                              title="Ver historial de intentos"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver</span>
                            </button>
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

      {/* Modal Historial de Intentos por Jugador */}
      {inspectingPlayerName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-kahoot-purple-dark border-2 border-white/20 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl p-2 bg-white/10 rounded-2xl">
                  {inspectingAttempts[0]?.avatar || '🦊'}
                </span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {inspectingPlayerName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {inspectingAttempts[0]?.branch && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                        🏢 {inspectingAttempts[0].branch}
                      </span>
                    )}
                    {inspectingAttempts[0]?.department && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        🍿 Área: {inspectingAttempts[0].department}
                      </span>
                    )}
                    <span className="text-xs text-white/60">
                      Historial y auditoría anti-fraude
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  const pRank = filteredRankings.findIndex(
                    p => normalizePlayerName(p.nickname) === normalizePlayerName(inspectingPlayerName)
                  ) + 1;
                  const acc = inspectingAttempts[0]?.accuracyPercentage || 0;
                  return (
                    <div className="hidden sm:block">
                      <InteractiveMedal3D
                        accuracy={acc}
                        rank={pRank > 0 ? pRank : undefined}
                        size="sm"
                      />
                    </div>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setInspectingPlayerName(null)}
                  className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Acciones Rápidas del Colaborador */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-black/40 rounded-2xl border border-white/10">
              <span className="text-xs text-white/70 font-semibold">
                Acciones de gestión para <strong className="text-amber-300">{inspectingPlayerName}</strong>:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!inspectingPlayerName) return;
                    if (window.confirm(`¿Habilitar un nuevo intento para "${inspectingPlayerName}"? Se reiniciarán sus registros de este examen para permitirle volver a contestar.`)) {
                      await handleClearUserQuizAttempts(inspectingPlayerName);
                      setInspectingPlayerName(null);
                    }
                  }}
                  className="btn-cinepolis-gold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-black shadow-md"
                  title="Permite que este colaborador vuelva a presentar el examen aunque el candado de reintentos esté activo"
                >
                  <Unlock className="w-3.5 h-3.5 text-black" />
                  <span>Habilitar Nuevo Intento</span>
                </button>

                {inspectingAttempts[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      const pRank = filteredRankings.findIndex(
                        p => normalizePlayerName(p.nickname) === normalizePlayerName(inspectingPlayerName)
                      ) + 1;
                      handleExportSingleDiploma(inspectingAttempts[0], pRank > 0 ? pRank : 1);
                    }}
                    className="btn-cinepolis-glass text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>Descargar Diploma</span>
                  </button>
                )}
              </div>
            </div>

            {/* Resumen de Trampas / Intentos / Cambios de Pestaña / Dispositivo */}
            {(() => {
              const firstAtt = inspectingAttempts[0];
              const hw = getHardwareHash(firstAtt?.deviceId);
              const sharedNames = hw ? Array.from(deviceUsersMap.get(hw) || []) : [];
              const totalTabs = inspectingAttempts.reduce((acc, a) => acc + (a.tabSwitches || 0), 0);
              const totalAwaySec = Math.round(
                inspectingAttempts.reduce((acc, a) => acc + (a.timeAwayMs || 0), 0) / 1000
              );

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10">
                    <span className="text-[11px] uppercase font-bold text-white/50 block">Reintentos de Nombre</span>
                    {inspectingAttempts.length > 1 ? (
                      <span className="text-sm font-black text-red-400 mt-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{inspectingAttempts.length} intentos ({inspectingAttempts.length - 1} extra)</span>
                      </span>
                    ) : (
                      <span className="text-sm font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>1 solo intento (Limpio)</span>
                      </span>
                    )}
                  </div>

                  <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10">
                    <span className="text-[11px] uppercase font-bold text-white/50 block">Cambios de Pestaña / App</span>
                    {totalTabs > 0 ? (
                      <span className="text-sm font-black text-amber-400 mt-1 flex items-center gap-1.5">
                        <EyeOff className="w-4 h-4 shrink-0" />
                        <span>{totalTabs} salida(s) ({totalAwaySec}s fuera)</span>
                      </span>
                    ) : (
                      <span className="text-sm font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>0 salidas de pantalla</span>
                      </span>
                    )}
                  </div>

                  <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10">
                    <span className="text-[11px] uppercase font-bold text-white/50 block">Huella de Dispositivo</span>
                    {sharedNames.length > 1 ? (
                      <div className="mt-1">
                        <span className="text-xs font-black text-rose-400 flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5 shrink-0" />
                          <span>Usado por {sharedNames.length} nombres:</span>
                        </span>
                        <span className="text-[10px] text-rose-200/80 block truncate" title={sharedNames.join(', ')}>
                          {sharedNames.join(', ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 shrink-0" />
                        <span>Dispositivo único personal</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Lista cronológica de intentos con desglose de preguntas */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-white/70">
                Desglose por Intento (del primero al último)
              </h4>

              {inspectingAttempts.map((attempt, idx) => {
                const isFirst = idx === 0;
                const scoreDiff = !isFirst ? attempt.totalScore - inspectingAttempts[0].totalScore : 0;
                const isExpanded = expandedAttemptId === attempt.id;
                const answers = attemptAnswers[attempt.id];

                return (
                  <div
                    key={attempt.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition ${
                      isFirst
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : 'bg-black/20 border-white/10'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                            isFirst
                              ? 'bg-emerald-500 text-black'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          Intento #{idx + 1} {isFirst ? '⭐ Oficial (1er Intento)' : 'Repetición'}
                        </span>
                        {!isFirst && scoreDiff !== 0 && (
                          <span
                            className={`text-xs font-bold ${
                              scoreDiff > 0 ? 'text-amber-400' : 'text-red-400'
                            }`}
                          >
                            ({scoreDiff > 0 ? `+${scoreDiff.toLocaleString()}` : scoreDiff.toLocaleString()} pts vs 1°)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-white/50 font-medium">
                        {new Date(attempt.completedAt).toLocaleString('es-MX', {
                          dateStyle: 'medium',
                          timeStyle: 'medium',
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-white/5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-white/50 block">Puntaje</span>
                        <span className="text-base font-black text-kahoot-yellow">
                          {attempt.totalScore.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-white/50 block">Aciertos</span>
                        <span className="text-sm font-extrabold text-white">
                          {attempt.correctAnswersCount} / {attempt.totalQuestionsCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-white/50 block">Precisión</span>
                        <span className="text-sm font-extrabold text-green-400">
                          {attempt.accuracyPercentage}%
                        </span>
                      </div>
                    </div>

                    {/* Botón para expandir/colapsar preguntas de este intento */}
                    <div className="pt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => loadAnswersForAttempt(attempt.id)}
                        className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 hover:text-white transition py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {isExpanded
                            ? 'Ocultar desglose de preguntas'
                            : `Ver preguntas contestadas (${attempt.correctAnswersCount}/${attempt.totalQuestionsCount})`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span className="text-[11px] text-white/40 font-mono">
                        ID: {attempt.id.slice(0, 8)}...
                      </span>
                    </div>

                    {/* Desglose desplegable de preguntas del intento */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                        {isLoadingAnswers && !answers ? (
                          <div className="py-6 text-center text-xs text-white/60 flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-kahoot-yellow" />
                            <span>Cargando detalle de preguntas registradas...</span>
                          </div>
                        ) : answers && answers.length > 0 ? (
                          <>
                            {/* Resumen rápido de qué preguntas falló */}
                            {(() => {
                              const wrongAnswers = answers.filter(a => !a.isCorrect);
                              const correctAnswers = answers.filter(a => a.isCorrect);
                              return (
                                <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-3">
                                    <span className="font-black text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{correctAnswers.length} Acertadas</span>
                                    </span>
                                    <span className="font-black text-red-400 flex items-center gap-1">
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>{wrongAnswers.length} Falladas</span>
                                    </span>
                                  </div>
                                  {wrongAnswers.length > 0 ? (
                                    <span className="text-red-300 font-bold text-[11px]">
                                      Falló en: Pregunta #{wrongAnswers.map(a => a.orderIndex + 1).join(', #')}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-300 font-bold text-[11px]">
                                      ⭐ ¡Excelente! Todas las preguntas fueron correctas
                                    </span>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Tarjetas individuales por pregunta */}
                            <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                              {answers.map(ans => {
                                const isAnsCorrect = ans.isCorrect;
                                return (
                                  <div
                                    key={ans.id}
                                    className={`p-3.5 rounded-2xl border text-xs transition ${
                                      isAnsCorrect
                                        ? 'bg-emerald-950/20 border-emerald-500/30'
                                        : 'bg-red-950/25 border-red-500/40'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`w-6 h-6 rounded-lg font-black text-[11px] flex items-center justify-center shrink-0 ${
                                            isAnsCorrect
                                              ? 'bg-emerald-500 text-black'
                                              : 'bg-red-500 text-white'
                                          }`}
                                        >
                                          #{ans.orderIndex + 1}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            isAnsCorrect
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                          }`}
                                        >
                                          {isAnsCorrect
                                            ? `✓ Correcta (+${ans.pointsAwarded} pts)`
                                            : '✗ Incorrecta (0 pts)'}
                                        </span>
                                      </div>

                                      <span className="text-[11px] text-white/50 font-medium">
                                        ⏱️ {(ans.timeTakenMs / 1000).toFixed(1)}s
                                      </span>
                                    </div>

                                    <p className="font-extrabold text-white text-xs mb-2">
                                      {ans.questionText}
                                    </p>

                                    {isAnsCorrect ? (
                                      <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2">
                                        <span className="text-emerald-400 font-bold shrink-0">Respuesta elegida:</span>
                                        <span className="font-semibold">{ans.selectedOptionText}</span>
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5">
                                        <div className="p-2 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
                                          <span className="text-red-400 font-bold shrink-0">Eligió (Errónea):</span>
                                          <span className="font-semibold">{ans.selectedOptionText}</span>
                                        </div>
                                        {ans.correctOptionText && (
                                          <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2">
                                            <span className="text-emerald-400 font-bold shrink-0">Respuesta correcta era:</span>
                                            <span className="font-semibold">{ans.correctOptionText}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/60">
                            <p className="font-semibold text-white/80">
                              ℹ️ Desglose individual de preguntas no disponible para este intento.
                            </p>
                            <p className="text-[11px] text-white/40 mt-1">
                              Fue registrado en una versión previa donde solo se almacenaban puntaje ({attempt.totalScore.toLocaleString()} pts) y aciertos ({attempt.correctAnswersCount}/{attempt.totalQuestionsCount}).
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Modal */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  if (inspectingAttempts.length > 0) {
                    const playerRank = filteredRankings.findIndex(
                      p => normalizePlayerName(p.nickname) === normalizePlayerName(inspectingPlayerName)
                    ) + 1;
                    handleExportSingleDiploma(inspectingAttempts[0], playerRank || 1);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg active:scale-95"
              >
                <Award className="w-4 h-4 text-black" />
                <span>Descargar Diploma Oficial</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectingPlayerName(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* TAB: PREGUNTAS MÁS DIFÍCILES & ANALÍTICAS */}
      {activeTab === 'analytics' && (() => {
        const totalAnswersEvaluated = questionAnalytics.reduce((sum, q) => sum + q.totalAnswers, 0);
        const totalCorrectEvaluated = questionAnalytics.reduce((sum, q) => sum + q.correctAnswers, 0);
        const totalIncorrectEvaluated = questionAnalytics.reduce((sum, q) => sum + q.incorrectAnswers, 0);
        const hardestQ = questionAnalytics[0];
        const bestQ = questionAnalytics[questionAnalytics.length - 1];

        return (
          <div className="space-y-6">
            <div className="bg-kahoot-purple-dark/80 p-6 rounded-3xl border border-white/10 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-red-500/20 text-red-300 rounded-xl">
                      <BarChart3 className="w-5 h-5" />
                    </span>
                    <h2 className="text-2xl font-black uppercase text-white tracking-tight">
                      Preguntas Más Difíciles y Tasa de Error
                    </h2>
                  </div>
                  <p className="text-xs text-white/70 mt-1">
                    Promedio exacto de cuántas personas contestaron bien y cuántas mal por pregunta, tiempos de respuesta y opciones elegidas.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const selectedQuiz = quizzes.find(q => q.id === selectedQuizId) || quizzes[0];
                      exportQuestionAnalyticsPDF(questionAnalytics, selectedQuiz?.title || 'Cinepolis Master');
                    }}
                    disabled={questionAnalytics.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black border border-white/10 transition shadow-lg active:scale-95 shrink-0"
                    title="Descargar reporte analítico completo en PDF con tasa de aciertos y fallos"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Reporte PDF</span>
                  </button>

                  <span className="px-3 py-1 bg-white/10 text-amber-300 text-xs font-bold rounded-xl border border-white/10">
                    Mayor índice de fallo primero ⚠️
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen Superior de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-red-500/30 shadow-lg">
                <span className="text-xs uppercase font-bold text-red-300">🚨 Pregunta con Mayor Fallo</span>
                <div className="text-2xl font-black text-red-400 mt-1">
                  {100 - (hardestQ?.accuracyPercentage || 0)}% de Error
                </div>
                <div className="text-xs font-bold text-white/90 mt-1">
                  Fallaron: <span className="text-red-400 font-extrabold">{hardestQ?.incorrectAnswers || 0} personas</span> | Acertaron: <span className="text-emerald-400">{hardestQ?.correctAnswers || 0}</span>
                </div>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">
                  {hardestQ?.questionText || 'Cargando...'}
                </p>
              </div>

              <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-white/10 shadow-lg">
                <span className="text-xs uppercase font-bold text-white/60">Tasa Global de Acierto</span>
                <div className="text-2xl font-black text-white mt-1">
                  {totalAnswersEvaluated > 0
                    ? Math.round((totalCorrectEvaluated / totalAnswersEvaluated) * 100)
                    : 0}
                  %
                </div>
                <div className="text-xs font-bold text-white/90 mt-1">
                  <span className="text-emerald-400">{totalCorrectEvaluated} aciertos</span> vs <span className="text-red-400">{totalIncorrectEvaluated} fallos</span>
                </div>
                <p className="text-xs text-white/50 mt-1">
                  Muestra acumulada de {totalAnswersEvaluated} respuestas analizadas
                </p>
              </div>

              <div className="bg-kahoot-purple-dark/80 p-5 rounded-2xl border border-emerald-500/30 shadow-lg">
                <span className="text-xs uppercase font-bold text-emerald-300">✅ Pregunta con Mayor Dominio</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {bestQ?.accuracyPercentage || 0}% de Aciertos
                </div>
                <div className="text-xs font-bold text-white/90 mt-1">
                  Acertaron: <span className="text-emerald-400 font-extrabold">{bestQ?.correctAnswers || 0} de {bestQ?.totalAnswers || 0} personas</span>
                </div>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">
                  {bestQ?.questionText || 'Cargando...'}
                </p>
              </div>
            </div>

            {/* Lista Detallada de Preguntas de Mayor a Menor Dificultad */}
            <div className="space-y-4">
              {questionAnalytics.map((q, idx) => {
                const isCritical = q.accuracyPercentage < 50;
                const isModerate = q.accuracyPercentage >= 50 && q.accuracyPercentage < 75;

                // Encontrar cuál fue el distractor incorrecto más votado
                const wrongOptions = (q.options || []).filter(o => !o.isCorrect);
                const mostChosenWrongOpt = wrongOptions.length > 0
                  ? wrongOptions.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), wrongOptions[0])
                  : null;

                return (
                  <div
                    key={q.questionId}
                    className={`p-5 rounded-3xl border transition-all shadow-md ${
                      isCritical
                        ? 'bg-red-950/20 border-red-500/40 hover:border-red-500/70'
                        : isModerate
                        ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70'
                        : 'bg-kahoot-purple-dark/80 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            isCritical
                              ? 'bg-red-500 text-white shadow-md'
                              : isModerate
                              ? 'bg-amber-500 text-black'
                              : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                            Pregunta original {q.orderIndex + 1}
                          </span>
                          <h3 className="text-base font-extrabold text-white">
                            {q.questionText}
                          </h3>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                            isCritical
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : isModerate
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isCritical ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Alta Dificultad ({100 - q.accuracyPercentage}% fallos)</span>
                            </>
                          ) : isModerate ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Dificultad Media ({100 - q.accuracyPercentage}% fallos)</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Buen Dominio ({q.accuracyPercentage}% aciertos)</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Cajas de métricas clave: Contestaron Bien vs Contestaron Mal */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
                      <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-2xl text-center">
                        <span className="text-[10px] uppercase font-black text-emerald-400/80 block">Contestaron BIEN</span>
                        <span className="text-xl font-black text-emerald-300 mt-0.5 block">
                          {q.correctAnswers} personas
                        </span>
                        <span className="text-[11px] text-emerald-400/70 font-bold block">
                          ({q.accuracyPercentage}% del total)
                        </span>
                      </div>

                      <div className="bg-red-950/40 border border-red-500/30 p-3 rounded-2xl text-center">
                        <span className="text-[10px] uppercase font-black text-red-400/80 block">Contestaron MAL</span>
                        <span className="text-xl font-black text-red-300 mt-0.5 block">
                          {q.incorrectAnswers} personas
                        </span>
                        <span className="text-[11px] text-red-400/70 font-bold block">
                          ({100 - q.accuracyPercentage}% de error)
                        </span>
                      </div>

                      <div className="bg-black/30 border border-white/10 p-3 rounded-2xl text-center">
                        <span className="text-[10px] uppercase font-black text-white/50 block">Tiempo Promedio</span>
                        <span className="text-xl font-black text-amber-300 mt-0.5 block">
                          {q.avgTimeSeconds ? `${q.avgTimeSeconds}s` : '—'}
                        </span>
                        <span className="text-[11px] text-white/40 font-bold block">
                          para responder
                        </span>
                      </div>

                      <div className="bg-black/30 border border-white/10 p-3 rounded-2xl text-center">
                        <span className="text-[10px] uppercase font-black text-white/50 block">Muestra Evaluada</span>
                        <span className="text-xl font-black text-white mt-0.5 block">
                          {q.totalAnswers}
                        </span>
                        <span className="text-[11px] text-white/40 font-bold block">
                          evaluaciones
                        </span>
                      </div>
                    </div>

                    {/* Barra Visual de Proporción Acierto vs Fallo */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-emerald-400 font-extrabold">
                          ✓ {q.correctAnswers} acertaron ({q.accuracyPercentage}%)
                        </span>
                        <span className="text-red-400 font-extrabold">
                          ✗ {q.incorrectAnswers} fallaron ({100 - q.accuracyPercentage}%)
                        </span>
                      </div>

                      <div className="w-full h-3.5 bg-black/50 rounded-full overflow-hidden border border-white/10 flex">
                        <div
                          style={{ width: `${q.accuracyPercentage}%` }}
                          className="h-full bg-emerald-500 transition-all duration-500"
                        />
                        <div
                          style={{ width: `${100 - q.accuracyPercentage}%` }}
                          className="h-full bg-red-600 transition-all duration-500"
                        />
                      </div>
                    </div>

                    {/* Desglose de Opciones Elegidas por los Participantes */}
                    {q.options && q.options.length > 0 && (
                      <div className="mt-3.5 pt-3.5 border-t border-white/10">
                        <span className="text-[11px] font-black uppercase tracking-wider text-white/60 block mb-2">
                          Distribución de Respuestas por Opción:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map(opt => {
                            const isOptCorrect = opt.isCorrect;
                            const isTopDistractor = !isOptCorrect && mostChosenWrongOpt && mostChosenWrongOpt.optionId === opt.optionId && opt.count > 0;

                            return (
                              <div
                                key={opt.optionId}
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition ${
                                  isOptCorrect
                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                    : isTopDistractor
                                    ? 'bg-red-950/30 border-red-500/40 text-red-200'
                                    : opt.count > 0
                                    ? 'bg-black/30 border-white/10 text-white/80'
                                    : 'bg-black/20 border-white/5 text-white/30'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      isOptCorrect ? 'bg-emerald-400' : isTopDistractor ? 'bg-red-400' : 'bg-white/30'
                                    }`}
                                  />
                                  <span className="truncate font-medium">{opt.optionText}</span>
                                  {isOptCorrect && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                                      Correcta
                                    </span>
                                  )}
                                  {isTopDistractor && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-black uppercase">
                                      Trampa más común
                                    </span>
                                  )}
                                </div>
                                <div className="shrink-0 text-right font-black">
                                  <span className={isOptCorrect ? 'text-emerald-300' : isTopDistractor ? 'text-red-300' : 'text-white/70'}>
                                    {opt.count} pers. ({opt.percentage}%)
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recomendación Didáctica para Cinépolis */}
                    <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/60 flex items-center gap-2">
                      <span className="font-bold text-white/80 shrink-0">💡 Diagnóstico:</span>
                      <span>
                        {isCritical
                          ? 'Se recomienda reforzar este tema específico con el equipo de Cinépolis ya que presenta la tasa de error más alta.'
                          : isModerate
                          ? 'Tema con comprensión intermedia. Con un breve recordatorio o ficha informativa puede consolidarse.'
                          : 'El equipo domina este concepto de forma consistente.'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* TAB: CANDADOS & CONTROL DE EXAMEN */}
      {activeTab === 'controls' && (
        <div className="space-y-6">
          <div className="bg-kahoot-purple-dark/80 p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </span>
                <h2 className="text-2xl font-black uppercase text-white tracking-tight">
                  Candado & Reglas de la Evaluación
                </h2>
              </div>
              <p className="text-xs text-white/70 mt-1">
                Controla la disponibilidad del cuestionario, horario de cierre y políticas preventivas de reintentos.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {settingsSaveMessage && (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 animate-pulse">
                  ✓ {settingsSaveMessage}
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveExamSettings}
                disabled={isLoading}
                className="px-5 py-3 rounded-xl bg-kahoot-yellow hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-xl active:scale-95 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Control 1: Candado Inmediato Abrir / Cerrar */}
            <div className="bg-kahoot-purple-dark/80 p-6 rounded-3xl border border-white/10 shadow-lg space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    {examSettings.isExamOpen ? (
                      <Unlock className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Lock className="w-5 h-5 text-red-400" />
                    )}
                    <span>Estado del Cuestionario</span>
                  </h3>
                  <p className="text-xs text-white/60 mt-1">
                    Abre o cierra el acceso inmediatamente para todos los participantes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExamSettings(prev => ({ ...prev, isExamOpen: !prev.isExamOpen }))
                  }
                  className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition border ${
                    examSettings.isExamOpen
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                  }`}
                >
                  {examSettings.isExamOpen ? 'Abierto' : 'Cerrado'}
                </button>
              </div>

              <div
                className={`p-4 rounded-2xl border text-xs font-semibold ${
                  examSettings.isExamOpen
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-950/20 border-red-500/30 text-red-300'
                }`}
              >
                {examSettings.isExamOpen
                  ? '🟢 El cuestionario está ABIERTO. Cualquier colaborador con el enlace puede ingresar y contestar.'
                  : '🔴 El cuestionario está CERRADO. Ningún jugador podrá ingresar al cuestionario.'}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-white/70 mb-1.5">
                  Mensaje personalizado si está cerrado
                </label>
                <input
                  type="text"
                  value={examSettings.closeMessage || ''}
                  onChange={e =>
                    setExamSettings(prev => ({ ...prev, closeMessage: e.target.value }))
                  }
                  placeholder="Ej. Esta evaluación ha finalizado..."
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white text-xs font-semibold focus:outline-none focus:border-kahoot-yellow"
                />
              </div>
            </div>

            {/* Control 2: Fecha y Hora de Cierre Programado */}
            <div className="bg-kahoot-purple-dark/80 p-6 rounded-3xl border border-white/10 shadow-lg space-y-5">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span>Horario Límite de Cierre</span>
                </h3>
                <p className="text-xs text-white/60 mt-1">
                  Programa una fecha y hora exacta tras la cual el examen se bloqueará automáticamente.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-white/70 mb-1.5">
                    Fecha y Hora de Cierre
                  </label>
                  <input
                    type="datetime-local"
                    value={examSettings.closeDate || ''}
                    onChange={e =>
                      setExamSettings(prev => ({ ...prev, closeDate: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white text-xs font-semibold focus:outline-none focus:border-kahoot-yellow"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const todayMidnight = new Date();
                      todayMidnight.setHours(23, 59, 0, 0);
                      const pad = (n: number) => String(n).padStart(2, '0');
                      const formatted = `${todayMidnight.getFullYear()}-${pad(todayMidnight.getMonth() + 1)}-${pad(todayMidnight.getDate())}T23:59`;
                      setExamSettings(prev => ({ ...prev, closeDate: formatted }));
                    }}
                    className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-xl border border-white/10 transition"
                  >
                    Hoy a las 11:59 PM
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExamSettings(prev => ({ ...prev, closeDate: undefined }))
                    }
                    className="py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-200 text-[11px] font-bold rounded-xl border border-red-500/20 transition"
                  >
                    Quitar Límite
                  </button>
                </div>

                <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-[11px] text-white/60">
                  {examSettings.closeDate ? (
                    <span className="text-amber-300 font-bold">
                      ⏰ El examen se cerrará automáticamente el:{' '}
                      {new Date(examSettings.closeDate).toLocaleString('es-MX', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  ) : (
                    <span>ℹ️ Sin límite de tiempo programado. El examen permanecerá abierto según el interruptor.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Control 3: Límite de Intentos por Colaborador */}
            <div className="bg-kahoot-purple-dark/80 p-6 rounded-3xl border border-white/10 shadow-lg space-y-4 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <span>Límite de Intentos por Colaborador</span>
                  </h3>
                  <p className="text-xs text-white/60 mt-1 max-w-2xl leading-relaxed">
                    Determina si los usuarios pueden realizar la evaluación únicamente <strong>1 sola vez</strong> o si tienen permitido contestar múltiples veces con registro y auditoría.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExamSettings(prev => ({
                        ...prev,
                        maxAttemptsPerUser: 1,
                        preventRetries: true,
                      }))
                    }
                    className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition border ${
                      (examSettings.maxAttemptsPerUser ?? 1) === 1
                        ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                        : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    1 Intento Único (Recomendado)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setExamSettings(prev => ({
                        ...prev,
                        maxAttemptsPerUser: 0,
                        preventRetries: false,
                      }))
                    }
                    className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition border ${
                      (examSettings.maxAttemptsPerUser ?? 1) === 0
                        ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                        : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    Intentos Ilimitados
                  </button>
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border text-xs font-semibold ${
                  (examSettings.maxAttemptsPerUser ?? 1) === 1
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                }`}
              >
                {(examSettings.maxAttemptsPerUser ?? 1) === 1 ? (
                  <span>
                    🔒 <strong>Intento Único Estricto:</strong> Cada colaborador solo podrá responder el examen una vez. Si intenta ingresar de nuevo, se le notificará que su intento ya fue enviado. Podrás habilitarle un nuevo intento individual desde la pestaña "Usuarios & Accesos" o en la inspección de participantes.
                  </span>
                ) : (
                  <span>
                    🔄 <strong>Múltiples Intentos Permitidos:</strong> Los colaboradores pueden practicar y repetir el examen libremente. En los rankings oficiales se conserva la auditoría de cada intento.
                  </span>
                )}
              </div>
            </div>

            {/* Control 4: Aleatorización Anti-Copia Vecinal */}
            <div className="bg-kahoot-purple-dark/80 p-6 rounded-3xl border border-white/10 shadow-lg space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Shuffle className="w-5 h-5 text-amber-400" />
                    <span>Aleatorización Anti-Copia Vecinal</span>
                  </h3>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    Desordena automáticamente el orden de las preguntas y la posición/color de las opciones (A, B, C, D) para que dos personas sentadas juntas no puedan copiarse.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExamSettings(prev => ({
                      ...prev,
                      shuffleQuestions: !(prev.shuffleQuestions ?? true),
                    }))
                  }
                  className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition border shrink-0 ${
                    examSettings.shuffleQuestions !== false
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/10 text-white/60 border-white/10'
                  }`}
                >
                  {examSettings.shuffleQuestions !== false ? 'Activo' : 'Orden Fijo'}
                </button>
              </div>
            </div>

            {/* Control 5: Catálogo de Sucursales / Conjuntos */}
            <div className="bg-kahoot-purple-dark/80 p-6 rounded-3xl border border-white/10 shadow-lg space-y-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <span>Sucursales / Conjuntos Cinépolis</span>
                </h3>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Déjalo vacío para que cada colaborador escriba libremente su cine, o escribe una lista separada por comas para mostrar un menú desplegable.
                </p>
              </div>

              <input
                type="text"
                value={branchesInput}
                onChange={e => setBranchesInput(e.target.value)}
                placeholder="Campo libre activo (Ej. opcional: Cinépolis Diana, Cinépolis Perisur...)"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white text-xs font-semibold focus:outline-none focus:border-kahoot-yellow"
              />
            </div>
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

              {/* Plantillas Cinépolis */}
              <button
                type="button"
                onClick={() => setShowTemplatesModal(true)}
                className="btn-cinepolis-gold flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black shadow-lg"
                title="Crear evaluación al instante usando plantillas oficiales prediseñadas"
              >
                <Sparkles className="w-4 h-4 text-black" />
                <span>⚡ Plantillas Cinépolis</span>
              </button>

              {/* Crear Cuestionario */}
              <button
                onClick={() => {
                  const newQuizId = generateUUID();
                  const firstQuesId = generateUUID();
                  setEditingQuiz({
                    id: newQuizId,
                    title: '',
                    description: '',
                    category: 'General',
                    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
                    timePerQuestion: 20,
                    createdAt: new Date().toISOString(),
                    isPublished: true,
                    questions: [
                      {
                        id: firstQuesId,
                        quizId: newQuizId,
                        questionText: '',
                        timeLimit: 20,
                        pointsMultiplier: 1.0,
                        questionType: 'multiple_choice',
                        options: [
                          { id: generateUUID(), text: '', isCorrect: true, color: 'red', shape: 'triangle', orderIndex: 0 },
                          { id: generateUUID(), text: '', isCorrect: false, color: 'blue', shape: 'diamond', orderIndex: 1 },
                          { id: generateUUID(), text: '', isCorrect: false, color: 'yellow', shape: 'circle', orderIndex: 2 },
                          { id: generateUUID(), text: '', isCorrect: false, color: 'green', shape: 'square', orderIndex: 3 },
                        ],
                      },
                    ],
                  });
                  setIsEditorOpen(true);
                }}
                className="btn-cinepolis-primary flex items-center gap-2 px-5 py-2.5 text-white font-black uppercase tracking-wider text-xs md:text-sm rounded-xl shadow-xl active:scale-95 transition"
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

          {/* Draft recovery banner */}
          {savedDraft && !isEditorOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-200"
            >
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-amber-300" />
                <span className="text-xs font-bold">
                  Hay un borrador autoguardado de <strong>"{savedDraft.title || 'Sin título'}"</strong> con {savedDraft.questions?.length || 0} pregunta(s).
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingQuiz(savedDraft);
                    setIsEditorOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-400 text-black font-black text-xs uppercase rounded-xl hover:bg-amber-300 transition"
                >
                  Recuperar Borrador
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('kahoot_editor_draft');
                    setSavedDraft(null);
                  }}
                  className="px-3 py-1.5 bg-white/10 text-white/70 font-bold text-xs rounded-xl hover:bg-white/20 transition"
                >
                  Descartar
                </button>
              </div>
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
                    {/* Compartir */}
                    <button
                      onClick={() => setSharingQuiz(quiz)}
                      className="p-2.5 bg-kahoot-yellow/20 hover:bg-kahoot-yellow/40 text-amber-300 rounded-xl border border-kahoot-yellow/30 transition active:scale-95"
                      title="Compartir enlace o código QR de este cuestionario"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
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

      {/* TAB: GESTIÓN DE USUARIOS & ACCESOS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-kahoot-purple-dark/80 p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
                  <Users className="w-5 h-5" />
                </span>
                <h2 className="text-2xl font-black uppercase text-white tracking-tight">
                  Control de Usuarios & Accesos ({usersList.length})
                </h2>
              </div>
              <p className="text-xs text-white/70 mt-1">
                Administra cuentas registradas, cambia permisos entre Administrador y Colaborador, restablece contraseñas y habilita nuevos intentos.
              </p>
            </div>

            {userActionMessage && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-3.5 py-2 rounded-xl border border-emerald-500/30 animate-pulse">
                ✓ {userActionMessage}
              </span>
            )}
          </div>

          {/* Filtros de Búsqueda de Usuarios */}
          <div className="bg-kahoot-purple-dark/80 p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo, # de empleado, cine o área..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value as any)}
                className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-xs sm:text-sm appearance-none focus:outline-none focus:border-amber-400"
              >
                <option value="all">Todos los Roles</option>
                <option value="admin">Solo Administradores</option>
                <option value="user">Solo Colaboradores</option>
              </select>

              <button
                type="button"
                onClick={async () => {
                  const u = await authService.getUsers();
                  setUsersList(u);
                }}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition active:scale-95"
                title="Actualizar lista de usuarios"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista / Tarjetas de Usuarios */}
          <div className="grid grid-cols-1 gap-3">
            {(() => {
              const q = userSearchQuery.trim().toLowerCase();
              const filtered = usersList.filter(u => {
                if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
                if (!q) return true;
                const displayName = (u.name || u.fullName || '').toLowerCase();
                return (
                  displayName.includes(q) ||
                  u.email.toLowerCase().includes(q) ||
                  u.nickname.toLowerCase().includes(q) ||
                  (u.employeeNumber && u.employeeNumber.toLowerCase().includes(q)) ||
                  (u.branch && u.branch.toLowerCase().includes(q)) ||
                  (u.department && u.department.toLowerCase().includes(q))
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center text-white/50 bg-black/20 rounded-2xl border border-white/5">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold">No se encontraron usuarios con esos filtros.</p>
                  </div>
                );
              }

              return filtered.map(u => (
                <div
                  key={u.id}
                  className="bg-kahoot-purple-dark/80 p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-white/20 transition"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-black text-lg shrink-0">
                      {(u.name || u.fullName || u.nickname).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-white">{u.name || u.fullName || u.nickname}</span>
                        <span className="text-xs text-white/50 font-semibold">(@{u.nickname})</span>
                        {u.role === 'admin' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black shadow-sm">
                            👑 Administrador
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            🍿 Colaborador
                          </span>
                        )}
                        {u.isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Activo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                            Suspendido
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60 mt-1.5 font-medium">
                        <span>📧 {u.email}</span>
                        {u.employeeNumber && <span>🎫 #{u.employeeNumber}</span>}
                        {u.branch && <span>🏢 {u.branch}</span>}
                        {u.department && <span>🍿 {u.department}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...u })}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                      title="Editar datos de usuario"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-300" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleUserRole(u)}
                      disabled={u.id === 'admin-cinepolis-master'}
                      className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-30"
                      title="Cambiar rol (Admin / Colaborador)"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{u.role === 'admin' ? 'Hacer Colaborador' : 'Hacer Admin'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResettingUserPassword({ id: u.id, name: u.fullName })}
                      className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                      title="Restablecer contraseña de esta cuenta"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Contraseña</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleClearUserQuizAttempts(u.nickname)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                      title="Permite que este usuario vuelva a contestar el cuestionario seleccionado"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Nuevo Intento</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleUserStatus(u)}
                      disabled={u.id === 'admin-cinepolis-master'}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-30"
                      title="Activar o suspender acceso a la cuenta"
                    >
                      {u.isActive ? <UserX className="w-3.5 h-3.5 text-red-400" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{u.isActive ? 'Suspender' : 'Activar'}</span>
                    </button>

                    {u.id !== 'admin-cinepolis-master' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUserAccount(u)}
                        className="p-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 transition active:scale-95"
                        title="Eliminar usuario definitivamente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* TAB: SINCRONIZACIÓN Y RESPALDO EN LA NUBE */}
      {activeTab === 'server' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-kahoot-purple-dark/80 rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-8 h-8 text-amber-400" />
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                  Sincronización en la Nube y Respaldo Central
                </h3>
                <p className="text-white/70 text-sm font-semibold">
                  Almacena y respalda usuarios, evaluaciones y rankings corporativos de forma segura.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-white/60 block">Estado del Servidor</span>
                <span className="font-extrabold text-base text-white">
                  {isSupabaseConfigured() ? (
                    <span className="text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Servidor en la Nube Conectado y Listo
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-2">
                      🛡️ Modo Local Protegido (Almacenamiento interno en navegador)
                    </span>
                  )}
                </span>
              </div>

              {isSupabaseConfigured() && (
                <button
                  onClick={handleSyncToServer}
                  className="btn-cinepolis-gold px-4 py-2 text-black font-black text-xs uppercase tracking-wider rounded-xl transition active:scale-95"
                >
                  Sincronizar con el Servidor
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
                Copias de Seguridad Fuera de Línea:
              </h4>
              <p className="font-medium text-white/70">
                Puedes descargar una copia completa de tus cuestionarios y preguntas a tu equipo para tener respaldo en cualquier momento, o restaurarla en otra computadora.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadQuizzesBackup}
                  className="btn-cinepolis-gold flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs"
                >
                  <FileDown className="w-4 h-4 text-black" />
                  <span>Descargar Respaldo Total (.json)</span>
                </button>

                <label className="btn-cinepolis-glass cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs">
                  <FileUp className="w-4 h-4 text-blue-300" />
                  <span>Restaurar Copia desde Archivo</span>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportQuizzesFile}
                  />
                </label>
              </div>

              {/* Blindaje y Privacidad */}
              <div className="pt-6 border-t border-white/10 space-y-3">
                <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Estándares de Seguridad y Privacidad Cinépolis</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                    <strong className="text-white block mb-1">🔐 Contraseñas Cifradas con Sal (Salted SHA-256)</strong>
                    <span className="text-white/60">Las contraseñas y respuestas de seguridad se transforman en hashes unidireccionales con sales criptográficas únicas; nunca se guardan en texto claro.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                    <strong className="text-white block mb-1">🛡️ Huella Digital Anti-Fraude</strong>
                    <span className="text-white/60">Cada dispositivo genera un hash criptográfico de hardware para alertar si un mismo celular contesta con nombres diferentes.</span>
                  </div>
                </div>
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
                      const newQId = generateUUID();
                      const newQuestion: Question = {
                        id: newQId,
                        quizId: editingQuiz.id,
                        questionText: '',
                        timeLimit: 20,
                        pointsMultiplier: 1.0,
                        questionType: 'multiple_choice',
                        options: [
                          { id: generateUUID(), text: '', isCorrect: true, color: 'red', shape: 'triangle', orderIndex: 0 },
                          { id: generateUUID(), text: '', isCorrect: false, color: 'blue', shape: 'diamond', orderIndex: 1 },
                          { id: generateUUID(), text: '', isCorrect: false, color: 'yellow', shape: 'circle', orderIndex: 2 },
                          { id: generateUUID(), text: '', isCorrect: false, color: 'green', shape: 'square', orderIndex: 3 },
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

                    {/* Ficha Formativa ("¿Por qué es la correcta?") */}
                    <div className="pt-3 border-t border-white/10">
                      <label className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Cápsula Formativa Cinépolis (¿Por qué es la correcta? - Opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder={
                          DEFAULT_EXPLANATIONS[ques.id] ||
                          'Ej. De acuerdo al estándar operativo Cinépolis, esta es la respuesta correcta porque...'
                        }
                        value={ques.explanation ?? DEFAULT_EXPLANATIONS[ques.id] ?? ''}
                        onChange={e => {
                          const updated = [...editingQuiz.questions];
                          updated[qIdx].explanation = e.target.value;
                          setEditingQuiz({ ...editingQuiz, questions: updated });
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-kahoot-yellow"
                      />
                    </div>
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
                  disabled={isSavingQuiz}
                  onClick={async () => {
                    if (!editingQuiz.title.trim()) {
                      alert('Por favor ingresa un título para el cuestionario.');
                      return;
                    }
                    // Validar que ninguna pregunta esté vacía
                    for (let i = 0; i < editingQuiz.questions.length; i++) {
                      if (!editingQuiz.questions[i].questionText.trim()) {
                        alert(`La Pregunta #${i + 1} no tiene texto. Por favor escribe el enunciado de la pregunta.`);
                        return;
                      }
                    }

                    setIsSavingQuiz(true);
                    try {
                      const saved = await quizService.saveQuiz(editingQuiz);
                      localStorage.removeItem('kahoot_editor_draft');
                      setSavedDraft(null);
                      setIsEditorOpen(false);
                      await loadData();
                      setJsonBackupStatus(`¡Cuestionario "${saved.title}" guardado exitosamente con ${saved.questions.length} pregunta(s)!`);
                      setTimeout(() => setJsonBackupStatus(''), 5000);
                    } catch (err: any) {
                      console.error('Error al guardar:', err);
                      alert('Error al guardar el cuestionario: ' + (err.message || 'Error desconocido'));
                    } finally {
                      setIsSavingQuiz(false);
                    }
                  }}
                  className={`px-6 py-3 rounded-xl font-black uppercase text-sm shadow-xl transition flex items-center gap-2 ${
                    isSavingQuiz
                      ? 'bg-amber-300 text-black cursor-not-allowed opacity-80'
                      : 'bg-kahoot-yellow hover:bg-amber-400 text-black active:scale-95'
                  }`}
                >
                  {isSavingQuiz ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando ({editingQuiz.questions.length} preguntas)...</span>
                    </>
                  ) : (
                    <span>Guardar Cuestionario ({editingQuiz.questions.length})</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Quiz Modal */}
      {sharingQuiz && (
        <ShareQuizModal
          quiz={sharingQuiz}
          onClose={() => setSharingQuiz(null)}
        />
      )}

      {/* MODAL: EDITAR DATOS DE USUARIO */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-kahoot-purple-dark border-2 border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-white space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-amber-400/20 text-amber-300 rounded-xl">
                    <Edit className="w-5 h-5" />
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    Editar Datos de Usuario
                  </h3>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateUserData} className="space-y-4">
                <div>
                  <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.name || editingUser.fullName || ''}
                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-semibold text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={editingUser.email}
                      onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-semibold text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                      # de Empleado / Nómina
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. EMP-0482"
                      value={editingUser.employeeNumber || ''}
                      onChange={e => setEditingUser({ ...editingUser, employeeNumber: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-semibold text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                      Sucursal / Conjunto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Cinépolis Las Américas"
                      value={editingUser.branch || ''}
                      onChange={e => setEditingUser({ ...editingUser, branch: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-semibold text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                      Área / Puesto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Dulcería, Taquilla..."
                      value={editingUser.department || ''}
                      onChange={e => setEditingUser({ ...editingUser, department: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-semibold text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                    Rol en la Plataforma
                  </label>
                  <select
                    value={editingUser.role}
                    disabled={editingUser.id === 'admin-cinepolis-master'}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-semibold text-sm focus:outline-none focus:border-amber-400 disabled:opacity-50"
                  >
                    <option value="user">Colaborador (Evaluaciones y Diplomas)</option>
                    <option value="admin">Administrador (Acceso al Panel de Control)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-cinepolis-gold px-5 py-2 text-black font-black text-xs rounded-xl"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: RESTABLECER CONTRASEÑA DE USUARIO */}
      <AnimatePresence>
        {resettingUserPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-kahoot-purple-dark border-2 border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-amber-400/20 text-amber-300 rounded-xl">
                    <Key className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-black uppercase tracking-tight">
                    Restablecer Contraseña
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setResettingUserPassword(null);
                    setNewTempPassword('');
                  }}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-white/70">
                Asigna una contraseña temporal para <strong>{resettingUserPassword.name}</strong>. El colaborador podrá usarla inmediatamente para acceder y luego cambiarla en su perfil.
              </p>

              <form onSubmit={handleResetUserPassword} className="space-y-4">
                <div>
                  <label className="text-xs uppercase font-bold text-white/70 block mb-1">
                    Nueva Contraseña Temporal (mínimo 6 caracteres) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newTempPassword}
                    onChange={e => setNewTempPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResettingUserPassword(null);
                      setNewTempPassword('');
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-cinepolis-gold px-5 py-2 text-black font-black text-xs rounded-xl"
                  >
                    Aplicar Nueva Contraseña
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: PLANTILLAS OFICIALES CINÉPOLIS */}
      <AnimatePresence>
        {showTemplatesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-kahoot-purple-dark border-2 border-white/20 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-white space-y-6"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-400 text-black rounded-xl shadow-md">
                      <Sparkles className="w-5 h-5" />
                    </span>
                    <h3 className="text-2xl font-black uppercase tracking-tight">
                      Plantillas Oficiales Cinépolis
                    </h3>
                  </div>
                  <p className="text-xs text-white/70 mt-1">
                    Crea una evaluación lista para operar en 1 clic. Podrás ajustar y editar cualquier pregunta, imagen o tiempo.
                  </p>
                </div>

                <button
                  onClick={() => setShowTemplatesModal(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CINEPOLIS_QUIZ_TEMPLATES.map(tmpl => (
                  <div
                    key={tmpl.id}
                    className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden hover:border-amber-400/40 transition flex flex-col justify-between group"
                  >
                    <div className="h-32 w-full relative overflow-hidden bg-black/60">
                      <img
                        src={tmpl.coverImage}
                        alt={tmpl.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black shadow-sm">
                        {tmpl.category}
                      </span>
                      <span className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm">
                        {tmpl.questions.length} Preguntas
                      </span>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-base font-black text-white leading-snug">
                          {tmpl.name}
                        </h4>
                        <p className="text-xs text-white/60 mt-1 leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newQuiz = instantiateQuizFromTemplate(tmpl);
                            setEditingQuiz(newQuiz);
                            setIsEditorOpen(true);
                            setShowTemplatesModal(false);
                          }}
                          className="btn-cinepolis-gold w-full py-2.5 rounded-xl text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-black" />
                          <span>Usar esta Plantilla</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
