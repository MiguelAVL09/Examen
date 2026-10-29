import { Quiz, Participant, QuizSession } from '../types/quiz';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Claves de almacenamiento local para modo offline / fallback
const LOCAL_STORAGE_QUIZZES_KEY = 'kahoot_quizzes_v1';
const LOCAL_STORAGE_PARTICIPANTS_KEY = 'kahoot_participants_v1';
const LOCAL_STORAGE_SESSIONS_KEY = 'kahoot_sessions_v1';

// Cuestionarios iniciales precargados de alta calidad
export const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: 'quiz-cultura-general',
    title: '🌍 Desafío Supremo: Cultura General y Curiosidades',
    description: 'Pon a prueba tus conocimientos sobre historia, ciencia, geografía y récords mundiales con el ritmo trepidante de Kahoot.',
    category: 'Cultura General',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    timePerQuestion: 20,
    createdAt: new Date().toISOString(),
    isPublished: true,
    questions: [
      {
        id: 'q1-1',
        questionText: '¿Cuál es el planeta más caliente de todo nuestro sistema solar?',
        timeLimit: 20,
        pointsMultiplier: 1.0,
        questionType: 'multiple_choice',
        imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=80',
        options: [
          { id: 'opt-1-1', text: 'Venus (por su efecto invernadero)', isCorrect: true, color: 'red', shape: 'triangle' },
          { id: 'opt-1-2', text: 'Mercurio (por estar más cerca)', isCorrect: false, color: 'blue', shape: 'diamond' },
          { id: 'opt-1-3', text: 'Marte', isCorrect: false, color: 'yellow', shape: 'circle' },
          { id: 'opt-1-4', text: 'Júpiter', isCorrect: false, color: 'green', shape: 'square' },
        ],
      },
      {
        id: 'q1-2',
        questionText: '¿En qué año llegó el ser humano por primera vez a la Luna en la misión Apolo 11?',
        timeLimit: 20,
        pointsMultiplier: 1.0,
        questionType: 'multiple_choice',
        imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop&q=80',
        options: [
          { id: 'opt-2-1', text: '1972', isCorrect: false, color: 'red', shape: 'triangle' },
          { id: 'opt-2-2', text: '1969', isCorrect: true, color: 'blue', shape: 'diamond' },
          { id: 'opt-2-3', text: '1965', isCorrect: false, color: 'yellow', shape: 'circle' },
          { id: 'opt-2-4', text: '1959', isCorrect: false, color: 'green', shape: 'square' },
        ],
      },
      {
        id: 'q1-3',
        questionText: '¿Qué animal marino posee 3 corazones y sangre de color azul?',
        timeLimit: 15,
        pointsMultiplier: 2.0, // Doble puntaje
        questionType: 'multiple_choice',
        imageUrl: 'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=800&auto=format&fit=crop&q=80',
        options: [
          { id: 'opt-3-1', text: 'El Delfín', isCorrect: false, color: 'red', shape: 'triangle' },
          { id: 'opt-3-2', text: 'El Tiburón Blanco', isCorrect: false, color: 'blue', shape: 'diamond' },
          { id: 'opt-3-3', text: 'La Mantarraya', isCorrect: false, color: 'yellow', shape: 'circle' },
          { id: 'opt-3-4', text: 'El Pulpo', isCorrect: true, color: 'green', shape: 'square' },
        ],
      },
      {
        id: 'q1-4',
        questionText: '¿Cuál es el país más grande del mundo en extensión territorial?',
        timeLimit: 15,
        pointsMultiplier: 1.0,
        questionType: 'multiple_choice',
        imageUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&auto=format&fit=crop&q=80',
        options: [
          { id: 'opt-4-1', text: 'Canadá', isCorrect: false, color: 'red', shape: 'triangle' },
          { id: 'opt-4-2', text: 'Estados Unidos', isCorrect: false, color: 'blue', shape: 'diamond' },
          { id: 'opt-4-3', text: 'Rusia', isCorrect: true, color: 'yellow', shape: 'circle' },
          { id: 'opt-4-4', text: 'China', isCorrect: false, color: 'green', shape: 'square' },
        ],
      },
      {
        id: 'q1-5',
        questionText: '¿El Monte Everest continúa creciendo unos milímetros cada año debido a las placas tectónicas?',
        timeLimit: 15,
        pointsMultiplier: 1.0,
        questionType: 'true_false',
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
        options: [
          { id: 'opt-5-1', text: 'VERDADERO', isCorrect: true, color: 'blue', shape: 'diamond' },
          { id: 'opt-5-2', text: 'FALSO', isCorrect: false, color: 'red', shape: 'triangle' },
        ],
      },
    ],
  },
  {
    id: 'quiz-tecnologia-programacion',
    title: '💻 Reto Tech: Programación y Desarrollo Web',
    description: 'Demuestra qué tanto sabes sobre JavaScript, React, historia de la computación e Inteligencia Artificial.',
    category: 'Tecnología',
    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    timePerQuestion: 20,
    createdAt: new Date().toISOString(),
    isPublished: true,
    questions: [
      {
        id: 'q2-1',
        questionText: '¿Quién creó el lenguaje JavaScript en tan solo 10 días en el año 1995?',
        timeLimit: 20,
        pointsMultiplier: 1.0,
        questionType: 'multiple_choice',
        imageUrl: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800&auto=format&fit=crop&q=80',
        options: [
          { id: 'opt-2-1-1', text: 'Brendan Eich', isCorrect: true, color: 'red', shape: 'triangle' },
          { id: 'opt-2-1-2', text: 'Guido van Rossum', isCorrect: false, color: 'blue', shape: 'diamond' },
          { id: 'opt-2-1-3', text: 'James Gosling', isCorrect: false, color: 'yellow', shape: 'circle' },
          { id: 'opt-2-1-4', text: 'Tim Berners-Lee', isCorrect: false, color: 'green', shape: 'square' },
        ],
      },
      {
        id: 'q2-2',
        questionText: '¿Cuál de los siguientes NO es un Hook estándar nativo de React?',
        timeLimit: 20,
        pointsMultiplier: 1.0,
        questionType: 'multiple_choice',
        imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80',
        options: [
          { id: 'opt-2-2-1', text: 'useState', isCorrect: false, color: 'red', shape: 'triangle' },
          { id: 'opt-2-2-2', text: 'useEffect', isCorrect: false, color: 'blue', shape: 'diamond' },
          { id: 'opt-2-2-3', text: 'useCompute', isCorrect: true, color: 'yellow', shape: 'circle' },
          { id: 'opt-2-2-4', text: 'useMemo', isCorrect: false, color: 'green', shape: 'square' },
        ],
      },
      {
        id: 'q2-3',
        questionText: '¿El lenguaje Python debe su nombre a la comedia británica "Monty Python" y no a la serpiente?',
        timeLimit: 15,
        pointsMultiplier: 1.0,
        questionType: 'true_false',
        imageUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&auto=format&fit=crop&q=80',
        options: [
          { id: 'opt-2-3-1', text: 'VERDADERO', isCorrect: true, color: 'blue', shape: 'diamond' },
          { id: 'opt-2-3-2', text: 'FALSO', isCorrect: false, color: 'red', shape: 'triangle' },
        ],
      },
      {
        id: 'q2-4',
        questionText: '¿Qué significa la letra "S" en el protocolo de transferencia web seguro HTTPS?',
        timeLimit: 15,
        pointsMultiplier: 2.0,
        questionType: 'multiple_choice',
        imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
        options: [
          { id: 'opt-2-4-1', text: 'Standard', isCorrect: false, color: 'red', shape: 'triangle' },
          { id: 'opt-2-4-2', text: 'Secure', isCorrect: true, color: 'blue', shape: 'diamond' },
          { id: 'opt-2-4-3', text: 'Socket', isCorrect: false, color: 'yellow', shape: 'circle' },
          { id: 'opt-2-4-4', text: 'Server', isCorrect: false, color: 'green', shape: 'square' },
        ],
      },
    ],
  },
];

// Helper para inicializar LocalStorage si está vacío
const initializeLocalQuizzes = (): Quiz[] => {
  const stored = localStorage.getItem(LOCAL_STORAGE_QUIZZES_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(DEFAULT_QUIZZES));
    return DEFAULT_QUIZZES;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_QUIZZES;
  }
};

export const quizService = {
  // Obtener todos los cuestionarios
  async getQuizzes(): Promise<Quiz[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: quizzesData, error: qError } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });

        if (qError) throw qError;
        if (quizzesData && quizzesData.length > 0) {
          // Obtener preguntas y opciones asociadas
          const quizzesWithQuestions: Quiz[] = await Promise.all(
            quizzesData.map(async q => {
              const { data: questionsData } = await supabase!
                .from('questions')
                .select('*, question_options(*)')
                .eq('quiz_id', q.id)
                .order('order_index', { ascending: true });

              return {
                id: q.id,
                title: q.title,
                description: q.description || '',
                coverImage: q.cover_image,
                category: q.category || 'General',
                timePerQuestion: q.time_per_question || 20,
                createdAt: q.created_at,
                isPublished: q.is_published,
                questions: (questionsData || []).map(ques => ({
                  id: ques.id,
                  quizId: ques.quiz_id,
                  questionText: ques.question_text,
                  imageUrl: ques.image_url,
                  timeLimit: ques.time_limit || 20,
                  pointsMultiplier: Number(ques.points_multiplier) || 1.0,
                  questionType: ques.question_type || 'multiple_choice',
                  options: (ques.question_options || []).map((opt: { id: string; option_text: string; is_correct: boolean; color: string; shape: string }) => ({
                    id: opt.id,
                    text: opt.option_text,
                    isCorrect: opt.is_correct,
                    color: opt.color as any,
                    shape: opt.shape as any,
                  })),
                })),
              };
            })
          );
          return quizzesWithQuestions;
        }
      } catch (err) {
        console.warn('Fallo al conectar con Supabase para quizzes, usando fallback local:', err);
      }
    }
    return initializeLocalQuizzes();
  },

  // Obtener un cuestionario específico por ID
  async getQuizById(id: string): Promise<Quiz | null> {
    const quizzes = await this.getQuizzes();
    return quizzes.find(q => q.id === id) || null;
  },

  // Guardar o actualizar un cuestionario
  async saveQuiz(quiz: Quiz): Promise<Quiz> {
    // 1. Guardar localmente
    const current = initializeLocalQuizzes();
    const idx = current.findIndex(q => q.id === quiz.id);
    let updatedQuizzes: Quiz[];
    if (idx >= 0) {
      updatedQuizzes = [...current];
      updatedQuizzes[idx] = { ...quiz, updatedAt: new Date().toISOString() };
    } else {
      updatedQuizzes = [{ ...quiz, createdAt: new Date().toISOString() }, ...current];
    }
    localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(updatedQuizzes));

    // 2. Si Supabase está configurado, sincronizar
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: upsertError } = await supabase.from('quizzes').upsert({
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          cover_image: quiz.coverImage,
          category: quiz.category,
          time_per_question: quiz.timePerQuestion || 20,
          is_published: quiz.isPublished ?? true,
          updated_at: new Date().toISOString(),
        });
        if (upsertError) throw upsertError;

        // Guardar preguntas
        for (let i = 0; i < quiz.questions.length; i++) {
          const ques = quiz.questions[i];
          const { error: qError } = await supabase.from('questions').upsert({
            id: ques.id,
            quiz_id: quiz.id,
            question_text: ques.questionText,
            image_url: ques.imageUrl || '',
            time_limit: ques.timeLimit || 20,
            points_multiplier: ques.pointsMultiplier || 1.0,
            question_type: ques.questionType || 'multiple_choice',
            order_index: i,
          });
          if (qError) throw qError;

          // Guardar opciones
          for (let j = 0; j < ques.options.length; j++) {
            const opt = ques.options[j];
            await supabase.from('question_options').upsert({
              id: opt.id,
              question_id: ques.id,
              option_text: opt.text,
              is_correct: opt.isCorrect,
              color: opt.color,
              shape: opt.shape,
              order_index: j,
            });
          }
        }
      } catch (err) {
        console.warn('No se pudo sincronizar el quiz con Supabase:', err);
      }
    }

    return quiz;
  },

  // Eliminar un cuestionario
  async deleteQuiz(id: string): Promise<boolean> {
    const current = initializeLocalQuizzes();
    const filtered = current.filter(q => q.id !== id);
    localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('quizzes').delete().eq('id', id);
      } catch (err) {
        console.warn('Error al borrar quiz en Supabase:', err);
      }
    }
    return true;
  },

  // Guardar resultado de participante
  async saveParticipantResult(participant: Participant): Promise<Participant> {
    // Guardar en local storage
    const stored = localStorage.getItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
    const list: Participant[] = stored ? JSON.parse(stored) : [];
    list.unshift(participant);
    localStorage.setItem(LOCAL_STORAGE_PARTICIPANTS_KEY, JSON.stringify(list));

    // Si Supabase está activo, guardar en tabla participants
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('participants').insert({
          id: participant.id,
          quiz_id: participant.quizId,
          session_id: participant.sessionId || null,
          nickname: participant.nickname,
          avatar: participant.avatar,
          total_score: participant.totalScore,
          streak: participant.streak,
          max_streak: participant.maxStreak,
          correct_answers_count: participant.correctAnswersCount,
          total_questions_count: participant.totalQuestionsCount,
          accuracy_percentage: participant.accuracyPercentage,
          completed_at: participant.completedAt,
        });

        // Guardar detalle de respuestas individuales
        if (participant.answers && participant.answers.length > 0) {
          const answerRows = participant.answers.map(ans => ({
            participant_id: participant.id,
            question_id: ans.questionId,
            selected_option_id: ans.selectedOptionId,
            is_correct: ans.isCorrect,
            time_taken_ms: ans.timeTakenMs,
            points_awarded: ans.pointsAwarded,
          }));
          await supabase.from('participant_answers').insert(answerRows);
        }
      } catch (err) {
        console.warn('Error guardando participante en Supabase:', err);
      }
    }

    return participant;
  },

  // Obtener rankings (Solo accesible para admins según el requerimiento del usuario)
  async getRankings(quizId?: string): Promise<Participant[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('participants')
          .select('*')
          .order('total_score', { ascending: false });

        if (quizId) {
          query = query.eq('quiz_id', quizId);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          return data.map((p: any) => ({
            id: p.id,
            quizId: p.quiz_id,
            sessionId: p.session_id,
            nickname: p.nickname,
            avatar: p.avatar || '🦊',
            totalScore: p.total_score,
            streak: p.streak || 0,
            maxStreak: p.max_streak || 0,
            correctAnswersCount: p.correct_answers_count || 0,
            totalQuestionsCount: p.total_questions_count || 0,
            accuracyPercentage: Number(p.accuracy_percentage) || 0,
            completedAt: p.completed_at || p.created_at,
          }));
        }
      } catch (err) {
        console.warn('Error obteniendo rankings de Supabase, usando local:', err);
      }
    }

    // Fallback a LocalStorage
    const stored = localStorage.getItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
    const list: Participant[] = stored ? JSON.parse(stored) : [];
    let filtered = list;
    if (quizId) {
      filtered = list.filter(p => p.quizId === quizId);
    }
    return filtered.sort((a, b) => b.totalScore - a.totalScore);
  },

  // Limpiar rankings (Admin only)
  async clearRankings(quizId?: string): Promise<boolean> {
    const stored = localStorage.getItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
    if (stored) {
      let list: Participant[] = JSON.parse(stored);
      if (quizId) {
        list = list.filter(p => p.quizId !== quizId);
      } else {
        list = [];
      }
      localStorage.setItem(LOCAL_STORAGE_PARTICIPANTS_KEY, JSON.stringify(list));
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        if (quizId) {
          await supabase.from('participants').delete().eq('quiz_id', quizId);
        } else {
          await supabase.from('participants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
      } catch (err) {
        console.warn('Error al limpiar rankings en Supabase:', err);
      }
    }
    return true;
  },

  // Crear una sesión de sala en vivo con PIN de 6 dígitos
  async createLiveSession(quizId: string): Promise<QuizSession> {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const session: QuizSession = {
      id: 'session-' + Date.now(),
      quizId,
      pin,
      status: 'lobby',
      currentQuestionIndex: 0,
      participants: [],
      createdAt: new Date().toISOString(),
    };

    const stored = localStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
    const sessions: QuizSession[] = stored ? JSON.parse(stored) : [];
    sessions.push(session);
    localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(sessions));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('quiz_sessions').insert({
          id: session.id,
          quiz_id: quizId,
          pin: session.pin,
          status: 'lobby',
          current_question_index: 0,
        });
      } catch (err) {
        console.warn('Error creando sesión en Supabase:', err);
      }
    }

    return session;
  },

  // Sincronizar todos los cuestionarios predeterminados a Supabase (Admin action)
  async syncSeedToSupabase(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        message: 'Supabase no está configurado. Por favor ingresa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env',
      };
    }

    try {
      const localQuizzes = initializeLocalQuizzes();
      for (const quiz of localQuizzes) {
        await this.saveQuiz(quiz);
      }
      return { success: true, message: '¡Cuestionarios y preguntas sincronizados exitosamente con Supabase!' };
    } catch (err: any) {
      return { success: false, message: `Error al sincronizar: ${err.message || 'Desconocido'}` };
    }
  },
};
