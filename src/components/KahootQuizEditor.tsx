import { useEffect, useId, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { BookOpen, Check, CheckSquare, HelpCircle, Image as ImageIcon, Keyboard, Link as LinkIcon, Plus, RefreshCw, Shuffle, Trash2, Upload } from 'lucide-react';
import type { Question, QuestionType, Quiz } from '../types/quiz';
import { DEFAULT_EXPLANATIONS, generateUUID } from '../services/quizService';
import { PRESET_IMAGES, processImageUpload } from '../utils/imageUtils';
import { isSurveyQuiz } from '../utils/quizKind';
import { CINEPOLIS_QUIZ_TEMPLATES, instantiateQuizFromTemplate } from '../utils/quizTemplates';
import { KahootShapeIcon } from './KahootShapes';

const surveyTemplate = CINEPOLIS_QUIZ_TEMPLATES.find(template => template.quizKind === 'survey');
const surveyColors = ['red', 'blue', 'yellow', 'green', 'blue'] as const;
const surveyShapes = ['triangle', 'diamond', 'circle', 'square', 'diamond'] as const;

function surveyOption(index: number, text = '') {
  return { id: generateUUID(), text, isCorrect: false, color: surveyColors[index], shape: surveyShapes[index], orderIndex: index };
}

function newSurveyQuestion(quizId: string): Question {
  return { id: generateUUID(), quizId, questionText: '', timeLimit: 0, pointsMultiplier: 0, questionType: 'survey_rating',
    options: ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo'].map((text, index) => surveyOption(index, text)) };
}

export function newKahootSurvey(): Quiz {
  const id = generateUUID();
  return { id, title: '', description: '', category: 'Encuesta', createdAt: new Date().toISOString(),
    quizKind: 'survey', isAnonymousSurvey: true, shuffleQuestions: false, maxAttemptsPerUser: 0, questions: [newSurveyQuestion(id)] };
}

interface KahootQuizEditorProps {
  editingQuiz: Quiz;
  setEditingQuiz: Dispatch<SetStateAction<Quiz | null>>;
  onClose: () => void;
  onSave: (quiz: Quiz) => Promise<void>;
  expertSurvey?: boolean;
}

export function KahootQuizEditor({ editingQuiz, setEditingQuiz, onClose, onSave, expertSurvey = false }: KahootQuizEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [saveError, setSaveError] = useState('');
  const survey = expertSurvey || isSurveyQuiz(editingQuiz);
  const title = expertSurvey ? 'Crear encuesta de Kahoot' : editingQuiz.title ? 'Editar Cuestionario' : 'Nuevo Cuestionario';

  useEffect(() => {
    const modal = dialog.current!;
    modal.showModal();
    return () => modal.close();
  }, []);

  async function save() {
    if (isSavingQuiz) return;
    setSaveError('');
    if (!editingQuiz.title.trim()) {
      setSaveError('Escribe un título para continuar.');
      return;
    }
    const emptyQuestion = editingQuiz.questions.findIndex(question => !question.questionText.trim());
    if (emptyQuestion >= 0) {
      setSaveError('Escribe el texto de la pregunta ' + (emptyQuestion + 1) + '.');
      return;
    }
    setIsSavingQuiz(true);
    try {
      await onSave(editingQuiz);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar la actividad.');
    } finally {
      setIsSavingQuiz(false);
    }
  }

  const handleQuestionTypeChange = (qIdx: number, newType: QuestionType) => {
    const updated = [...editingQuiz.questions];
    const ques = { ...updated[qIdx] };
    if (ques.questionType === newType) return;
    updated[qIdx] = ques;
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
    } else if (newType === 'survey_rating') {
      ques.options = newSurveyQuestion(editingQuiz.id).options;
      ques.correctOrder = undefined;
      ques.acceptedAnswers = undefined;
    } else if (newType === 'type_answer') {
      ques.options = [];
      ques.correctOrder = undefined;
      ques.acceptedAnswers = survey ? undefined : [''];
    }

    setEditingQuiz({ ...editingQuiz, questions: updated });
  };

  const handleImageFileChange = async (qIdx: number, file: File | null) => {
    if (!file) return;
    const quizId = editingQuiz.id;
    const questionId = editingQuiz.questions[qIdx].id;
    try {
      const compressedDataUrl = await processImageUpload(file);
      setEditingQuiz(current => current?.id === quizId ? {
        ...current, questions: current.questions.map(question => question.id === questionId ? { ...question, imageUrl: compressedDataUrl } : question),
      } : current);
    } catch (err: any) {
      alert(err.message || 'Error al procesar la imagen.');
    }
  };

  const handleCoverImageChange = async (file: File | null) => {
    if (!file) return;
    const quizId = editingQuiz.id;
    try {
      const compressedDataUrl = await processImageUpload(file, 900, 500);
      setEditingQuiz(current => current?.id === quizId ? { ...current, coverImage: compressedDataUrl } : current);
    } catch (err: any) {
      alert(err.message || 'Error al procesar la imagen.');
    }
  };

  return <dialog ref={dialog} aria-labelledby={headingId} onCancel={event => {
    event.preventDefault();
    if (!isSavingQuiz) onClose();
  }} className="m-auto w-[calc(100%-1rem)] max-w-4xl max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain rounded-3xl border-2 border-white/20 bg-kahoot-purple-dark p-4 text-white shadow-2xl backdrop:bg-black/80 sm:p-6 md:p-8">
    <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
      <div>
        <h3 id={headingId} className="text-2xl font-black tracking-tight">{title}</h3>
      </div>
      <button
        type="button" onClick={onClose} disabled={isSavingQuiz} aria-label="Cerrar editor"
        className="p-2 text-white/60 hover:text-white text-xl font-black"
      >
        ✕
      </button>
    </div>

    {expertSurvey && surveyTemplate && !editingQuiz.title && !editingQuiz.description && editingQuiz.questions.length === 1 && !editingQuiz.questions[0].questionText && (
      <button type="button" className="quiz-action mb-5" onClick={() => setEditingQuiz(instantiateQuizFromTemplate(surveyTemplate))}>
        Usar plantilla de clima laboral
      </button>
    )}

    {/* Quiz General Info Form */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div>
        <label htmlFor={`${headingId}-title`} className="text-xs uppercase font-bold text-white/70 block mb-1">
          {survey ? 'Título de la encuesta' : 'Título del cuestionario'}
        </label>
        <input
          type="text"
          id={`${headingId}-title`}
          maxLength={expertSurvey ? 120 : undefined}
          value={editingQuiz.title}
          onChange={e => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
          placeholder={survey ? 'Ej. Clima laboral' : 'Ej. Desafío de Historia y Ciencias'}
          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-kahoot-yellow"
        />
      </div>

      <div>
        <label htmlFor={`${headingId}-category`} className="text-xs uppercase font-bold text-white/70 block mb-1">
          Categoría
        </label>
        <input
          type="text"
          id={`${headingId}-category`}
          maxLength={expertSurvey ? 80 : undefined}
          value={editingQuiz.category}
          onChange={e => setEditingQuiz({ ...editingQuiz, category: e.target.value })}
          placeholder="Ej. Entretenimiento, Educación..."
          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-kahoot-yellow"
        />
      </div>

      {(!survey || !editingQuiz.isAnonymousSurvey) && <div>
        <label className="text-xs uppercase font-bold text-white/70 block mb-1">
          Oportunidades (Intentos)
        </label>
        <select
          value={
            editingQuiz.maxAttemptsPerUser !== undefined
              ? editingQuiz.maxAttemptsPerUser
              : editingQuiz.preventRetries
              ? 1
              : 0
          }
          onChange={e => {
            const val = Number(e.target.value);
            setEditingQuiz({
              ...editingQuiz,
              maxAttemptsPerUser: val,
              preventRetries: val === 1,
            });
          }}
          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
        >
          <option value={1} className="bg-slate-900 text-white">🔒 1 Intento Único (Estricto)</option>
          <option value={2} className="bg-slate-900 text-white">🔄 2 Intentos (1 + Recuperación)</option>
          <option value={3} className="bg-slate-900 text-white">🔄 3 Intentos</option>
          <option value={0} className="bg-slate-900 text-white">✨ Intentos Ilimitados</option>
        </select>
      </div>}

      {survey && <label className="flex items-center gap-2 self-center text-sm font-bold text-white">
        <input type="checkbox" checked={!!editingQuiz.isAnonymousSurvey} onChange={event => setEditingQuiz({ ...editingQuiz, isAnonymousSurvey: event.target.checked })} />
        Respuestas anónimas
      </label>}

      <div className="md:col-span-3">
        <label htmlFor={`${headingId}-description`} className="text-xs uppercase font-bold text-white/70 block mb-1">
          Descripción
        </label>
        <textarea
          id={`${headingId}-description`}
          maxLength={expertSurvey ? 600 : undefined}
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
                          <span>Subir imagen</span>
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
          type="button"
          disabled={isSavingQuiz || (expertSurvey && editingQuiz.questions.length >= 30)}
          onClick={() => {
            const newQId = generateUUID();
            const newQuestion: Question = survey ? newSurveyQuestion(editingQuiz.id) : {
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
            {survey && <button type="button" aria-pressed={ques.questionType === 'survey_rating'}
              onClick={() => handleQuestionTypeChange(qIdx, 'survey_rating')}
              className={`p-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 ${ques.questionType === 'survey_rating' ? 'bg-kahoot-yellow text-black' : 'bg-white/5 text-white/70'}`}>
              <CheckSquare className="w-3.5 h-3.5" /> Opción múltiple
            </button>}
            {!expertSurvey && <>
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
            </>}

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
              <span>{survey ? 'Respuesta abierta' : 'Escribir Respuesta'}</span>
            </button>
          </div>

          {/* Question Text, Time Limit & Multiplier */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
            <div className={expertSurvey ? 'md:col-span-12' : 'md:col-span-8'}>
              <label htmlFor={`${headingId}-question-${ques.id}`} className="text-[11px] font-bold text-white/60 block mb-1">
                Pregunta {qIdx + 1}
              </label>
              <input
                type="text"
                id={`${headingId}-question-${ques.id}`}
                maxLength={expertSurvey ? 300 : undefined}
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

            {!expertSurvey && <>
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
            </>}
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
                              <span>Subir imagen</span>
                    <input

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

          {ques.questionType === 'survey_rating' && <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-white/80 mb-2">Opciones de respuesta</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ques.options.map((option, index) => <div key={option.id} className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/30 px-3">
                <KahootShapeIcon shape={option.shape} size={18} />
                <input type="text" aria-label={`Opción ${index + 1} de la pregunta ${qIdx + 1}`} maxLength={expertSurvey ? 100 : undefined}
                  value={option.text} placeholder={`Opción ${index + 1}`} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white"
                  onChange={event => {
                    const options = ques.options.map(item => item.id === option.id ? { ...item, text: event.target.value } : item);
                    setEditingQuiz({ ...editingQuiz, questions: editingQuiz.questions.map(item => item.id === ques.id ? { ...item, options } : item) });
                  }} />
                {ques.options.length > 2 && <button type="button" className="p-2 text-red-300" aria-label={`Quitar opción ${index + 1} de la pregunta ${qIdx + 1}`}
                  onClick={() => {
                    const options = ques.options.filter(item => item.id !== option.id).map((item, position) => ({ ...item, orderIndex: position }));
                    setEditingQuiz({ ...editingQuiz, questions: editingQuiz.questions.map(item => item.id === ques.id ? { ...item, options } : item) });
                  }}><Trash2 size={16} /></button>}
              </div>)}
            </div>
            {ques.options.length < 5 && <button type="button" className="quiz-action" onClick={() => {
              const options = [...ques.options, surveyOption(ques.options.length)];
              setEditingQuiz({ ...editingQuiz, questions: editingQuiz.questions.map(item => item.id === ques.id ? { ...item, options } : item) });
            }}><Plus size={16} /> Agregar opción</button>}
          </fieldset>}

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
          {ques.questionType === 'type_answer' && !survey && (
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
          {!expertSurvey && <div className="pt-3 border-t border-white/10">
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
          </div>}
        </div>
      ))}
    </div>

    {/* Modal Actions */}
    {saveError && <p role="alert" className="mt-5 rounded-xl bg-red-950/60 p-3 text-sm text-red-200">{saveError}</p>}
    <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10 mt-8">
      <button
        type="button" onClick={onClose} disabled={isSavingQuiz}
        className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition"
      >
        Cancelar
      </button>
      <button
        disabled={isSavingQuiz}
        type="button" onClick={() => void save()}
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
          <span>{expertSurvey ? 'Publicar encuesta' : `Guardar Cuestionario (${editingQuiz.questions.length})`}</span>
        )}
      </button>
    </div>
  </dialog>;
}
