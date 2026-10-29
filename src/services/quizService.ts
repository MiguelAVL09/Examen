import type { Quiz, Participant, QuizSession } from '../types/quiz';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_QUIZZES_KEY = 'kahoot_quizzes_v2';
const LOCAL_STORAGE_PARTICIPANTS_KEY = 'kahoot_participants_v1';
const LOCAL_STORAGE_SESSIONS_KEY = 'kahoot_sessions_v1';

export const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: 'f3f7aa07-4389-4769-a162-3fb8b989bfc0',
    title: 'Cinepolis Máster ¿Qué tanto sabemos?',
    description: 'Prueba tus conocimientos como cinepolito con esta pequeño cuestionario interactivo',
    category: 'General',
    coverImage: '/cinepolis-cover.jpg',
    timePerQuestion: 20,
    createdAt: '2026-10-29T01:33:05.752Z',
    isPublished: true,
    questions: [
      {
        id: 'q-1793237314249-1',
        questionText: '¿Qué porcentaje de puntos se gana con cada uno de los niveles?',
        timeLimit: 20,
        pointsMultiplier: 1.0,
        questionType: 'multiple_choice',
        imageUrl: '',
        options: [
          {
            id: 'opt-1',
            text: 'Fan 5%, Fanático 8% y Superfanático 10%',
            isCorrect: false,
            color: 'red',
            shape: 'triangle',
            orderIndex: 0,
          },
          {
            id: 'opt-2',
            text: 'Fan 5%, Fanático 10% y SuperFanático 10%',
            isCorrect: true,
            color: 'blue',
            shape: 'diamond',
            orderIndex: 1,
          },
          {
            id: 'opt-3',
            text: 'Fan 3%, Fanático 6% y SuperFanático 10%',
            isCorrect: false,
            color: 'yellow',
            shape: 'circle',
            orderIndex: 2,
          },
          {
            id: 'opt-4',
            text: 'Fan 2%, Fanático 6% y SuperFanático 12%',
            isCorrect: false,
            color: 'green',
            shape: 'square',
            orderIndex: 3,
          },
        ],
      },
    ],
  },
];

// Helper para inicializar LocalStorage de forma segura preservando cuestionarios creados
const initializeLocalQuizzes = (): Quiz[] => {
  const stored = localStorage.getItem(LOCAL_STORAGE_QUIZZES_KEY);
  if (stored === null) {
    // Si no existe v2, verificar si existe v1 del usuario
    const storedV1 = localStorage.getItem('kahoot_quizzes_v1');
    if (storedV1) {
      try {
        const parsedV1 = JSON.parse(storedV1);
        if (Array.isArray(parsedV1) && parsedV1.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(parsedV1));
          return parsedV1;
        }
      } catch {}
    }
    localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(DEFAULT_QUIZZES));
    return DEFAULT_QUIZZES;
  }
  try {
    const parsed: Quiz[] = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      // Si el navegador contiene en caché únicamente los cuestionarios de prueba antiguos ("quiz-cultura-general", "quiz-tecnologia-programacion")
      // y no tiene el de Cinépolis, actualizar automáticamente a DEFAULT_QUIZZES
      const hasCinepolis = parsed.some(
        q => (q.title && q.title.toLowerCase().includes('cinepolis')) || q.id === DEFAULT_QUIZZES[0].id
      );
      const onlyHasOldDemos =
        parsed.length > 0 &&
        parsed.every(q => q.id === 'quiz-cultura-general' || q.id === 'quiz-tecnologia-programacion');

      if (onlyHasOldDemos && !hasCinepolis) {
        localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(DEFAULT_QUIZZES));
        return DEFAULT_QUIZZES;
      }
      return parsed;
    }
    return DEFAULT_QUIZZES;
  } catch {
    return DEFAULT_QUIZZES;
  }
};

export const quizService = {
  async getQuizzes(): Promise<Quiz[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: quizzesData, error: qError } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });

        if (qError) throw qError;
        if (quizzesData && quizzesData.length > 0) {
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
                  questionType: (ques.question_type as any) || 'multiple_choice',
                  correctOrder: ques.correct_order || undefined,
                  acceptedAnswers: ques.accepted_answers || undefined,
                  options: (ques.question_options || []).map((opt: any) => ({
                    id: opt.id,
                    text: opt.option_text,
                    isCorrect: opt.is_correct,
                    color: opt.color as any,
                    shape: opt.shape as any,
                    orderIndex: opt.order_index,
                  })),
                })),
              };
            })
          );
          localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(quizzesWithQuestions));
          return quizzesWithQuestions;
        }
      } catch (err) {
        console.warn('Fallo al conectar con Supabase para quizzes, usando fallback local:', err);
      }
    }
    return initializeLocalQuizzes();
  },

  async getQuizById(id: string): Promise<Quiz | null> {
    const quizzes = await this.getQuizzes();
    return quizzes.find(q => q.id === id) || null;
  },

  async saveQuiz(quiz: Quiz): Promise<Quiz> {
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
            correct_order: ques.correctOrder || null,
            accepted_answers: ques.acceptedAnswers || null,
            order_index: i,
          });
          if (qError) throw qError;

          for (let j = 0; j < ques.options.length; j++) {
            const opt = ques.options[j];
            await supabase.from('question_options').upsert({
              id: opt.id,
              question_id: ques.id,
              option_text: opt.text,
              is_correct: opt.isCorrect,
              color: opt.color,
              shape: opt.shape,
              order_index: opt.orderIndex ?? j,
            });
          }
        }
      } catch (err) {
        console.warn('No se pudo sincronizar el quiz con Supabase:', err);
      }
    }

    return quiz;
  },

  async deleteQuiz(id: string): Promise<boolean> {
    const current = initializeLocalQuizzes();
    const filtered = current.filter(
      q => q.id !== id && q.id !== 'quiz-cultura-general' && q.id !== 'quiz-tecnologia-programacion'
    );
    localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('quizzes').delete().eq('id', id);
        // También intentar borrar los demos si estaban en Supabase
        await supabase.from('quizzes').delete().eq('id', 'quiz-cultura-general');
        await supabase.from('quizzes').delete().eq('id', 'quiz-tecnologia-programacion');
      } catch (err) {
        console.warn('Error al borrar quiz en Supabase:', err);
      }
    }
    return true;
  },

  // Exportar todos los cuestionarios a formato JSON descargable para respaldo absoluto
  exportQuizzesToJson(): string {
    const quizzes = initializeLocalQuizzes();
    return JSON.stringify(quizzes, null, 2);
  },

  // Importar cuestionarios desde archivo o texto JSON sin borrar los existentes
  async importQuizzesFromJson(jsonString: string): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const imported: Quiz[] = JSON.parse(jsonString);
      if (!Array.isArray(imported)) {
        return { success: false, count: 0, message: 'El formato del archivo JSON no es una lista válida de cuestionarios.' };
      }

      const current = initializeLocalQuizzes();
      let addedCount = 0;

      for (const q of imported) {
        if (q.id && q.title && Array.isArray(q.questions)) {
          const existsIdx = current.findIndex(item => item.id === q.id);
          if (existsIdx >= 0) {
            current[existsIdx] = q;
          } else {
            current.unshift(q);
          }
          addedCount++;
          // Sincronizar también con Supabase si está activo
          if (isSupabaseConfigured() && supabase) {
            this.saveQuiz(q).catch(() => {});
          }
        }
      }

      localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(current));
      return { success: true, count: addedCount, message: `Se importaron/actualizaron exitosamente ${addedCount} cuestionario(s).` };
    } catch (err: any) {
      return { success: false, count: 0, message: `Error al procesar el archivo: ${err.message || 'JSON inválido'}` };
    }
  },

  async saveParticipantResult(participant: Participant): Promise<Participant> {
    const stored = localStorage.getItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
    const list: Participant[] = stored ? JSON.parse(stored) : [];
    list.unshift(participant);
    localStorage.setItem(LOCAL_STORAGE_PARTICIPANTS_KEY, JSON.stringify(list));

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

    const stored = localStorage.getItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
    const list: Participant[] = stored ? JSON.parse(stored) : [];
    let filtered = list;
    if (quizId) {
      filtered = list.filter(p => p.quizId === quizId);
    }
    return filtered.sort((a, b) => b.totalScore - a.totalScore);
  },

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
