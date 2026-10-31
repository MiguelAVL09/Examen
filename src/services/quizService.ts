import type { Quiz, Participant, QuizSession } from '../types/quiz';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface ExamSettings {
  isExamOpen: boolean;
  closeDate?: string;
  preventRetries: boolean;
  closeMessage?: string;
}

export interface OptionStat {
  optionId: string;
  optionText: string;
  isCorrect: boolean;
  color?: string;
  shape?: string;
  count: number;
  percentage: number;
}

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  questionType: string;
  imageUrl?: string;
  orderIndex: number;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyPercentage: number;
  avgTimeSeconds: number;
  difficulty: 'hard' | 'medium' | 'easy';
  options: OptionStat[];
}

export interface DetailedParticipantAnswer {
  id: string;
  participantId: string;
  questionId: string;
  selectedOptionId: string | null;
  selectedOptionText: string;
  isCorrect: boolean;
  timeTakenMs: number;
  pointsAwarded: number;
  questionText: string;
  questionType: string;
  correctOptionText: string;
  orderIndex: number;
}

const LOCAL_STORAGE_QUIZZES_KEY = 'kahoot_quizzes_v2';
const LOCAL_STORAGE_PARTICIPANTS_KEY = 'kahoot_participants_v1';
const LOCAL_STORAGE_SESSIONS_KEY = 'kahoot_sessions_v1';

export const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
    title: "Cinepolis Máster ¿Qué tanto sabemos?",
    description: "Prueba tus conocimientos como cinepolito con esta pequeño cuestionario interactivo",
    category: "General",
    coverImage: "/cinepolis-cover.jpg",
    timePerQuestion: 20,
    createdAt: "2026-10-29T02:18:37.983552+00:00",
    isPublished: true,
    questions: [
      {
        "id": "6eceecf4-9d8b-4bf3-9e3d-c70d746158d5",
        "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
        "questionText": "¿Qué porcentaje de puntos se gana con cada uno de los niveles?",
        "imageUrl": "/question-images/cinepolis-q1.jpg",
        "timeLimit": 20,
        "pointsMultiplier": 1,
        "questionType": "multiple_choice",
        "options": [
          {
            "id": "9bf02723-0657-4baa-a071-e51bc16203a3",
            "text": "Fan 5%, Fanático 8% y Superfanático 10%",
            "isCorrect": false,
            "color": "red",
            "shape": "triangle",
            "orderIndex": 0
          },
          {
            "id": "37f36090-2271-4dfd-872f-c874e7de9f97",
            "text": "Fan 5%, Fanático 10% y SuperFanático 10%",
            "isCorrect": true,
            "color": "blue",
            "shape": "diamond",
            "orderIndex": 1
          },
          {
            "id": "36ca77c8-472d-46bd-b9f1-57634f705bc6",
            "text": "Fan 3%, Fanático 6% y SuperFanático 10%",
            "isCorrect": false,
            "color": "yellow",
            "shape": "circle",
            "orderIndex": 2
          },
          {
            "id": "9706e1f9-4280-46fa-b50b-9bc2b21296c4",
            "text": "Fan 2%, Fanático 6% y SuperFanático 12%",
            "isCorrect": false,
            "color": "green",
            "shape": "square",
            "orderIndex": 3
          }
        ],
        "orderIndex": 0
      },
      {
        "id": "3ff1eebf-ce29-47c1-bb3d-e4909a3bf321",
        "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
        "questionText": "¿Cuál es el beneficio de cumpleaños en el nivel Fanático?",
        "imageUrl": "/question-images/cinepolis-q2.jpg",
        "timeLimit": 20,
        "pointsMultiplier": 1,
        "questionType": "multiple_choice",
        "options": [
          {
            "id": "8881a704-5f11-4796-9810-e7f0d01f4c3a",
            "text": "1 entrada gratis",
            "isCorrect": false,
            "color": "red",
            "shape": "triangle",
            "orderIndex": 0
          },
          {
            "id": "a52da216-24ba-42a9-b59a-ec2251a21e42",
            "text": "2x1 todo el mes de cumpleaños en entradas, palomitas y refresco",
            "isCorrect": true,
            "color": "blue",
            "shape": "diamond",
            "orderIndex": 1
          },
          {
            "id": "6c6530aa-b939-4d87-be21-cb86e963bc1c",
            "text": "Combo mediano gratis",
            "isCorrect": false,
            "color": "yellow",
            "shape": "circle",
            "orderIndex": 2
          },
          {
            "id": "98e3b334-a212-4217-be0f-b42551a37c44",
            "text": "50% de descuento en dulcería una sola vez",
            "isCorrect": false,
            "color": "green",
            "shape": "square",
            "orderIndex": 3
          }
        ],
        "orderIndex": 1
      },
      {
        "id": "fbc0709d-cb9e-4e4b-9721-a39c99ec20b4",
        "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
        "questionText": "¿Cuáles son las tres opciones correctas para subir de nivel a Súper Fanático?",
        "imageUrl": "/question-images/cinepolis-q3.jpg",
        "timeLimit": 20,
        "pointsMultiplier": 1,
        "questionType": "multiple_choice",
        "options": [
          {
            "id": "1a111a11-1111-4111-8111-111111111111",
            "text": "15 visitas, 12 compras en dulcería o 200 puntos",
            "isCorrect": false,
            "color": "red",
            "shape": "triangle",
            "orderIndex": 0
          },
          {
            "id": "2b222b22-2222-4222-8222-222222222222",
            "text": "30 visitas en taquilla, 15 compras en dulcería de más de $100 o 350 puntos",
            "isCorrect": false,
            "color": "blue",
            "shape": "diamond",
            "orderIndex": 1
          },
          {
            "id": "3c333c33-3333-4333-8333-333333333333",
            "text": "24 visitas, 12 compras en dulcería con monto mínimo de $108 o 280 puntos",
            "isCorrect": true,
            "color": "yellow",
            "shape": "circle",
            "orderIndex": 2
          },
          {
            "id": "4d444d44-4444-4444-8444-444444444444",
            "text": "Solo acumulando 500 puntos en todo el año",
            "isCorrect": false,
            "color": "green",
            "shape": "square",
            "orderIndex": 3
          }
        ],
        "orderIndex": 2
      },
      {
        "id": "e44d03da-1662-4aa8-ab1f-1c4bcaad3e97",
        "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
        "questionText": "¿Cuántas visitas o puntos se necesitan para ser nivel Fanático?",
        "imageUrl": "/question-images/cinepolis-q4.jpg",
        "timeLimit": 20,
        "pointsMultiplier": 1,
        "questionType": "multiple_choice",
        "options": [
          {
            "id": "10111a11-1111-4111-8111-111111111111",
            "text": "6 visitas o 70 puntos",
            "isCorrect": false,
            "color": "red",
            "shape": "triangle",
            "orderIndex": 0
          },
          {
            "id": "20222b22-2222-4222-8222-222222222222",
            "text": "12 visitas o 140 puntos",
            "isCorrect": true,
            "color": "blue",
            "shape": "diamond",
            "orderIndex": 1
          },
          {
            "id": "30333c33-3333-4333-8333-333333333333",
            "text": "18 visitas o 200 puntos",
            "isCorrect": false,
            "color": "yellow",
            "shape": "circle",
            "orderIndex": 2
          },
          {
            "id": "40444d44-4444-4444-8444-444444444444",
            "text": "24 visitas o 250 puntos",
            "isCorrect": false,
            "color": "green",
            "shape": "square",
            "orderIndex": 3
          }
        ],
        "orderIndex": 3
      },
      {
        "id": "a3a1f948-c89b-4654-8e47-e5cf920a4ceb",
        "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
        "questionText": "¿El Club Cinépolis otorga cortesías de entrada en el nivel Fanático?",
        "imageUrl": "/question-images/cinepolis-q5.jpg",
        "timeLimit": 20,
        "pointsMultiplier": 1,
        "questionType": "true_false",
        "options": [
          {
            "id": "50555a11-1111-4111-8111-111111111111",
            "text": "VERDADERO",
            "isCorrect": false,
            "color": "blue",
            "shape": "diamond",
            "orderIndex": 0
          },
          {
            "id": "60666b22-2222-4222-8222-222222222222",
            "text": "FALSO",
            "isCorrect": true,
            "color": "red",
            "shape": "triangle",
            "orderIndex": 1
          }
        ],
        "orderIndex": 4
      },
      {
        "id": "3e527fc6-f04b-4657-b0a7-862ad39ec1c1",
        "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
        "questionText": "¿Cuál es el beneficio que se otorga al registrarse por primera vez en el Club Cinépolis?",
        "imageUrl": "/question-images/cinepolis-q6.jpg",
        "timeLimit": 20,
        "pointsMultiplier": 1,
        "questionType": "multiple_choice",
        "options": [
          {
            "id": "70777a11-1111-4111-8111-111111111111",
            "text": "2x1 en entradas",
            "isCorrect": false,
            "color": "red",
            "shape": "triangle",
            "orderIndex": 0
          },
          {
            "id": "80888b22-2222-4222-8222-222222222222",
            "text": "Un frappé mediano o palomitas de mantequilla gratis",
            "isCorrect": true,
            "color": "blue",
            "shape": "diamond",
            "orderIndex": 1
          },
          {
            "id": "90999c33-3333-4333-8333-333333333333",
            "text": "50 puntos de cortesía",
            "isCorrect": false,
            "color": "yellow",
            "shape": "circle",
            "orderIndex": 2
          },
          {
            "id": "00000d44-4444-4444-8444-444444444444",
            "text": "Ningún beneficio hasta acumular puntos o visitas",
            "isCorrect": false,
            "color": "green",
            "shape": "square",
            "orderIndex": 3
          }
        ],
        "orderIndex": 5
      },
      {
        "id": "2738e13b-884f-4134-91f2-52fae0a0290d",
        "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
        "questionText": "Una persona no puede ser creativa en el área, debe acatarse a las reglas",
        "imageUrl": "/question-images/cinepolis-q7.jpg",
        "timeLimit": 20,
        "pointsMultiplier": 1,
        "questionType": "true_false",
        "options": [
          {
            "id": "a0aa1a11-1111-4111-8111-111111111111",
            "text": "VERDADERO",
            "isCorrect": false,
            "color": "blue",
            "shape": "diamond",
            "orderIndex": 0
          },
          {
            "id": "b0bb2b22-2222-4222-8222-222222222222",
            "text": "FALSO",
            "isCorrect": true,
            "color": "red",
            "shape": "triangle",
            "orderIndex": 1
          }
        ],
        "orderIndex": 6
      },
      {
        "id": "b43c79a7-efe6-4940-8738-f502ebc3ec9b",
        "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
        "questionText": "Todos tenemos un dominio, un área o campo en el qué sobre salimos más",
        "imageUrl": "/question-images/cinepolis-q8.jpg",
        "timeLimit": 20,
        "pointsMultiplier": 1,
        "questionType": "true_false",
        "options": [
          {
            "id": "c0cc1a11-1111-4111-8111-111111111111",
            "text": "VERDADERO",
            "isCorrect": true,
            "color": "blue",
            "shape": "diamond",
            "orderIndex": 0
          },
          {
            "id": "d0dd2b22-2222-4222-8222-222222222222",
            "text": "FALSO",
            "isCorrect": false,
            "color": "red",
            "shape": "triangle",
            "orderIndex": 1
          }
        ],
        "orderIndex": 7
      }
],
  },
];

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const generateUUID = (id?: string): string => {
  if (id && UUID_REGEX.test(id)) {
    return id;
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const sanitizeQuizForStorage = (quiz: Quiz): Quiz => {
  const quizId = generateUUID(quiz.id);
  return {
    ...quiz,
    id: quizId,
    questions: (quiz.questions || []).map((ques, qIdx) => {
      const quesId = generateUUID(ques.id);
      return {
        ...ques,
        id: quesId,
        quizId: quizId,
        orderIndex: qIdx,
        options: (ques.options || []).map((opt, oIdx) => ({
          ...opt,
          id: generateUUID(opt.id),
          orderIndex: opt.orderIndex ?? oIdx,
        })),
      };
    }),
  };
};

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
          const sanitized = parsedV1.map(q => sanitizeQuizForStorage(q));
          localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(sanitized));
          return sanitized;
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

      
      // Si el cuestionario de Cinépolis en local tiene menos preguntas que DEFAULT_QUIZZES, actualizarlo
      const cineIdx = parsed.findIndex(
        q => (q.title && q.title.toLowerCase().includes('cinepolis')) || q.id === DEFAULT_QUIZZES[0].id
      );
      if (cineIdx >= 0 && (parsed[cineIdx].questions?.length || 0) < DEFAULT_QUIZZES[0].questions.length) {
        parsed[cineIdx].questions = DEFAULT_QUIZZES[0].questions;
        localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(parsed));
      }

      if (onlyHasOldDemos && !hasCinepolis) {
        localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(DEFAULT_QUIZZES));
        return DEFAULT_QUIZZES;
      }
      return parsed.map(q => sanitizeQuizForStorage(q));
    }
    return DEFAULT_QUIZZES;
  } catch {
    return DEFAULT_QUIZZES;
  }
};

export const quizService = {
  async getQuizzes(): Promise<Quiz[]> {
    const localQuizzes = initializeLocalQuizzes();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: quizzesData, error: qError } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });

        if (qError) throw qError;
        if (quizzesData && quizzesData.length > 0) {
          const remoteQuizzes: Quiz[] = await Promise.all(
            quizzesData.map(async q => {
              const { data: questionsData } = await supabase!
                .from('questions')
                .select('*, question_options(*)')
                .eq('quiz_id', q.id)
                .order('order_index', { ascending: true });

              let cleanDescription = q.description || '';
              let settings: Partial<ExamSettings> = { closeDate: undefined, preventRetries: false };
              if (cleanDescription.includes('<!--SETTINGS:')) {
                try {
                  const parts = cleanDescription.split('<!--SETTINGS:');
                  cleanDescription = parts[0];
                  const parsed = JSON.parse(parts[1].replace('-->', ''));
                  settings = { ...settings, ...parsed };
                } catch {}
              }

              const localSettings = quizService.getExamSettings(q.id);

              return {
                id: q.id,
                title: q.title,
                description: cleanDescription,
                coverImage: q.cover_image,
                category: q.category || 'General',
                timePerQuestion: q.time_per_question || 20,
                createdAt: q.created_at,
                isPublished: q.is_published,
                isExamOpen: q.is_published ?? true,
                closeDate: settings.closeDate || localSettings.closeDate,
                preventRetries: settings.preventRetries ?? localSettings.preventRetries ?? false,
                closeMessage: settings.closeMessage || localSettings.closeMessage,
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

          // Fusión inteligente: nunca permitir que datos remotos obsoletos
          // sobreescriban una versión local que tenga más preguntas
          const merged = remoteQuizzes.map(remoteQ => {
            const matchingLocal = localQuizzes.find(
              lq => lq.id === remoteQ.id || (lq.title && lq.title.trim().toLowerCase() === remoteQ.title.trim().toLowerCase())
            );
            if (matchingLocal && (matchingLocal.questions?.length || 0) > (remoteQ.questions?.length || 0)) {
              return matchingLocal;
            }
            return remoteQ;
          });

          // Preservar cuestionarios locales que aún no estén en Supabase
          localQuizzes.forEach(lq => {
            if (!merged.some(mq => mq.id === lq.id || (mq.title && mq.title.trim().toLowerCase() === lq.title.trim().toLowerCase()))) {
              merged.push(lq);
            }
          });

          localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(merged));
          return merged;
        }
      } catch (err) {
        console.warn('Fallo al conectar con Supabase para quizzes, usando fallback local:', err);
      }
    }
    return localQuizzes;
  },

  async getQuizById(id: string): Promise<Quiz | null> {
    const quizzes = await this.getQuizzes();
    return quizzes.find(q => q.id === id) || null;
  },

  async saveQuiz(rawQuiz: Quiz): Promise<Quiz> {
    const quizToSave = sanitizeQuizForStorage(rawQuiz);
    const now = new Date().toISOString();
    quizToSave.updatedAt = now;

    // 1. Guardar primero en LocalStorage para garantizar que NUNCA se pierdan los datos
    const current = initializeLocalQuizzes();
    const idx = current.findIndex(
      q => q.id === quizToSave.id || (q.title && q.title.trim().toLowerCase() === quizToSave.title.trim().toLowerCase())
    );
    let updatedQuizzes: Quiz[];
    if (idx >= 0) {
      updatedQuizzes = [...current];
      updatedQuizzes[idx] = quizToSave;
    } else {
      updatedQuizzes = [quizToSave, ...current];
    }
    localStorage.setItem(LOCAL_STORAGE_QUIZZES_KEY, JSON.stringify(updatedQuizzes));

    // 2. Sincronizar de forma atómica y limpia con Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: upsertError } = await supabase.from('quizzes').upsert({
          id: quizToSave.id,
          title: quizToSave.title,
          description: quizToSave.description || '',
          cover_image: quizToSave.coverImage || '',
          category: quizToSave.category || 'General',
          time_per_question: quizToSave.timePerQuestion || 20,
          is_published: quizToSave.isPublished ?? true,
          updated_at: now,
        });
        if (upsertError) {
          console.error('Error al guardar quiz en Supabase:', upsertError);
          throw upsertError;
        }

        // Limpiar preguntas previas de este quiz antes de reinsertar para sincronización limpia
        await supabase.from('questions').delete().eq('quiz_id', quizToSave.id);

        for (let i = 0; i < quizToSave.questions.length; i++) {
          const ques = quizToSave.questions[i];
          const { error: qError } = await supabase.from('questions').insert({
            id: ques.id,
            quiz_id: quizToSave.id,
            question_text: ques.questionText,
            image_url: ques.imageUrl || '',
            time_limit: ques.timeLimit || 20,
            points_multiplier: ques.pointsMultiplier || 1.0,
            question_type: ques.questionType || 'multiple_choice',
            correct_order: ques.correctOrder || null,
            accepted_answers: ques.acceptedAnswers || null,
            order_index: i,
          });
          if (qError) {
            console.error('Error al insertar pregunta en Supabase:', qError);
            throw qError;
          }

          if (ques.options && ques.options.length > 0) {
            const optionsToInsert = ques.options.map((opt, j) => ({
              id: opt.id,
              question_id: ques.id,
              option_text: opt.text,
              is_correct: opt.isCorrect,
              color: opt.color,
              shape: opt.shape,
              order_index: opt.orderIndex ?? j,
            }));
            const { error: optError } = await supabase.from('question_options').insert(optionsToInsert);
            if (optError) {
              console.error('Error al insertar opciones en Supabase:', optError);
              throw optError;
            }
          }
        }
      } catch (err: any) {
        console.warn('Advertencia de sincronización en Supabase (datos protegidos en local):', err);
      }
    }

    return quizToSave;
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

  async saveParticipantResult(rawParticipant: Participant): Promise<Participant> {
    const OFFICIAL_QUIZ_UUID = 'f3f7aa07-4389-4769-a162-3fb8b989bfc0';
    const validQuizId = (rawParticipant.quizId && UUID_REGEX.test(rawParticipant.quizId))
      ? rawParticipant.quizId
      : OFFICIAL_QUIZ_UUID;

    const participant: Participant = {
      ...rawParticipant,
      id: generateUUID(rawParticipant.id),
      quizId: validQuizId,
    };

    const stored = localStorage.getItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
    const list: Participant[] = stored ? JSON.parse(stored) : [];
    list.unshift(participant);
    localStorage.setItem(LOCAL_STORAGE_PARTICIPANTS_KEY, JSON.stringify(list));

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: pError } = await supabase.from('participants').insert({
          id: participant.id,
          quiz_id: participant.quizId,
          session_id: participant.sessionId ? generateUUID(participant.sessionId) : null,
          nickname: participant.nickname || 'Participante',
          avatar: participant.avatar || '🦊',
          total_score: participant.totalScore || 0,
          streak: participant.streak || 0,
          max_streak: participant.maxStreak || 0,
          correct_answers_count: participant.correctAnswersCount || 0,
          total_questions_count: participant.totalQuestionsCount || 0,
          accuracy_percentage: participant.accuracyPercentage || 0,
          completed_at: participant.completedAt || new Date().toISOString(),
        });

        if (pError) {
          console.error('Error insertando participante en Supabase:', pError);
          throw pError;
        }

        if (participant.answers && participant.answers.length > 0) {
          const answerRows = participant.answers.map(ans => ({
            id: generateUUID(),
            participant_id: participant.id,
            question_id: generateUUID(ans.questionId),
            selected_option_id: ans.selectedOptionId ? generateUUID(ans.selectedOptionId) : null,
            is_correct: ans.isCorrect,
            time_taken_ms: ans.timeTakenMs || 0,
            points_awarded: ans.pointsAwarded || 0,
          }));
          const { error: ansError } = await supabase.from('participant_answers').insert(answerRows);
          if (ansError) {
            console.warn('Error insertando respuestas del participante en Supabase:', ansError);
          }
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
          .neq('nickname', '__deleted__')
          .gte('total_score', 0)
          .order('total_score', { ascending: false });

        if (quizId) {
          query = query.eq('quiz_id', quizId);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (data) {
          const validRows = data.filter((p: any) => p.nickname !== '__deleted__' && Number(p.total_score) >= 0);
          return validRows.map((p: any) => ({
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
    let filtered = list.filter(p => p.nickname !== '__deleted__' && p.totalScore >= 0);
    if (quizId) {
      filtered = filtered.filter(p => p.quizId === quizId);
    }
    return filtered.sort((a, b) => b.totalScore - a.totalScore);
  },

  async clearRankings(quizId?: string): Promise<boolean> {
    // 1. Limpiar en LocalStorage
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

    // 2. Limpiar en Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        // Intentar borrado físico si las políticas RLS lo permiten
        if (quizId) {
          await supabase.from('participants').delete().eq('quiz_id', quizId);
        } else {
          const { data: allP } = await supabase.from('participants').select('id');
          if (allP && allP.length > 0) {
            const ids = allP.map(p => p.id);
            await supabase.from('participant_answers').delete().in('participant_id', ids);
            await supabase.from('participants').delete().in('id', ids);
          }
        }

        // Soft-delete garantizado ante cualquier restricción de RLS en Supabase
        if (quizId) {
          await supabase
            .from('participants')
            .update({ nickname: '__deleted__', total_score: -1 })
            .eq('quiz_id', quizId);
        } else {
          await supabase
            .from('participants')
            .update({ nickname: '__deleted__', total_score: -1 })
            .neq('nickname', '__deleted__');
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

  getExamSettings(quizId: string): ExamSettings {
    try {
      const local = localStorage.getItem(`kahoot_exam_settings_${quizId}`);
      if (local) {
        return JSON.parse(local);
      }
    } catch {}
    return {
      isExamOpen: true,
      closeDate: undefined,
      preventRetries: false,
      closeMessage: 'Esta evaluación se encuentra cerrada por el administrador.',
    };
  },

  async saveExamSettings(quizId: string, settings: ExamSettings): Promise<void> {
    try {
      localStorage.setItem(`kahoot_exam_settings_${quizId}`, JSON.stringify(settings));
    } catch {}

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: qData } = await supabase.from('quizzes').select('description').eq('id', quizId).maybeSingle();
        let desc = qData?.description || '';
        if (desc.includes('<!--SETTINGS:')) {
          desc = desc.split('<!--SETTINGS:')[0];
        }
        const settingsMeta = `<!--SETTINGS:${JSON.stringify({
          closeDate: settings.closeDate,
          preventRetries: settings.preventRetries,
          closeMessage: settings.closeMessage,
        })}-->`;

        await supabase.from('quizzes').update({
          is_published: settings.isExamOpen,
          description: desc + settingsMeta,
          updated_at: new Date().toISOString(),
        }).eq('id', quizId);
      } catch (err) {
        console.warn('Error guardando ajustes de examen en Supabase:', err);
      }
    }
  },

  isExamAccessible(quiz: Quiz): { accessible: boolean; reason?: string } {
    if (quiz.isPublished === false || quiz.isExamOpen === false) {
      return {
        accessible: false,
        reason: quiz.closeMessage || 'Esta evaluación ha sido cerrada por el administrador y ya no admite nuevas respuestas.',
      };
    }

    if (quiz.closeDate) {
      const now = new Date();
      const closeTime = new Date(quiz.closeDate);
      if (!isNaN(closeTime.getTime()) && now > closeTime) {
        return {
          accessible: false,
          reason: `La evaluación concluyó el ${closeTime.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}. Ya no es posible enviar nuevas respuestas.`,
        };
      }
    }

    return { accessible: true };
  },

  async hasParticipantAttempt(quizId: string, nickname: string): Promise<boolean> {
    const normalize = (name: string) =>
      (name || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
    const targetNorm = normalize(nickname);
    if (!targetNorm) return false;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('participants')
          .select('nickname')
          .eq('quiz_id', quizId)
          .neq('nickname', '__deleted__');
        if (!error && data) {
          return data.some((p: any) => normalize(p.nickname) === targetNorm);
        }
      } catch {}
    }

    const rankings = await this.getRankings(quizId);
    return rankings.some(p => normalize(p.nickname) === targetNorm);
  },

  async getParticipantAnswers(participantId: string, quiz?: Quiz): Promise<DetailedParticipantAnswer[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('participant_answers')
          .select(`
            id,
            participant_id,
            question_id,
            selected_option_id,
            is_correct,
            time_taken_ms,
            points_awarded,
            questions (
              id,
              question_text,
              question_type,
              order_index,
              question_options (
                id,
                option_text,
                is_correct
              )
            ),
            question_options (
              id,
              option_text,
              is_correct
            )
          `)
          .eq('participant_id', participantId);

        if (!error && data && data.length > 0) {
          return data.map((row: any) => {
            const q = row.questions || {};
            const opts: any[] = q.question_options || [];
            const correctOpt = opts.find((o: any) => o.is_correct);
            const chosenOpt = row.question_options;

            return {
              id: row.id,
              participantId: row.participant_id,
              questionId: row.question_id,
              selectedOptionId: row.selected_option_id,
              selectedOptionText: chosenOpt?.option_text || 'Sin selección',
              isCorrect: Boolean(row.is_correct),
              timeTakenMs: row.time_taken_ms || 0,
              pointsAwarded: row.points_awarded || 0,
              questionText: q.question_text || 'Pregunta',
              questionType: q.question_type || 'multiple_choice',
              correctOptionText: correctOpt?.option_text || '',
              orderIndex: q.order_index ?? 0,
            };
          }).sort((a: any, b: any) => a.orderIndex - b.orderIndex);
        }
      } catch (err) {
        console.warn('Error fetching participant answers from Supabase:', err);
      }
    }

    // Fallback a LocalStorage si no está en Supabase o estamos offline
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
      if (stored) {
        const participants: Participant[] = JSON.parse(stored);
        const participant = participants.find(p => p.id === participantId);
        if (participant && participant.answers && participant.answers.length > 0) {
          return participant.answers.map((ans, idx) => {
            const q = quiz?.questions?.find(item => item.id === ans.questionId);
            const chosenOpt = q?.options?.find(opt => opt.id === ans.selectedOptionId);
            const correctOpt = q?.options?.find(opt => opt.isCorrect);

            return {
              id: `local-ans-${idx}`,
              participantId: participant.id,
              questionId: ans.questionId,
              selectedOptionId: ans.selectedOptionId,
              selectedOptionText: chosenOpt?.text || (ans.submittedText ? ans.submittedText : 'Sin selección'),
              isCorrect: ans.isCorrect,
              timeTakenMs: ans.timeTakenMs || 0,
              pointsAwarded: ans.pointsAwarded || 0,
              questionText: q?.questionText || `Pregunta ${idx + 1}`,
              questionType: ans.questionType || 'multiple_choice',
              correctOptionText: correctOpt?.text || '',
              orderIndex: q?.orderIndex ?? idx,
            };
          }).sort((a, b) => a.orderIndex - b.orderIndex);
        }
      }
    } catch {}

    return [];
  },

  async getQuestionAnalytics(quiz: Quiz): Promise<QuestionAnalytics[]> {
    const questions = quiz.questions || [];
    let answersData: any[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('participant_answers')
          .select('question_id, selected_option_id, is_correct, time_taken_ms');
        if (!error && data && data.length > 0) {
          answersData = data;
        }
      } catch (err) {
        console.warn('Error fetching participant_answers:', err);
      }
    }

    if (answersData.length === 0) {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
        if (stored) {
          const list: Participant[] = JSON.parse(stored);
          list.forEach(p => {
            if (p.answers && p.answers.length > 0) {
              p.answers.forEach(a => {
                answersData.push({
                  question_id: a.questionId,
                  selected_option_id: a.selectedOptionId,
                  is_correct: a.isCorrect,
                  time_taken_ms: a.timeTakenMs,
                });
              });
            }
          });
        }
      } catch {}
    }

    return questions.map((q, index) => {
      const qAnswers = answersData.filter(a => a.question_id === q.id);
      const total = qAnswers.length;
      const correct = qAnswers.filter(a => a.is_correct).length;
      const incorrect = total - correct;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const totalTime = qAnswers.reduce((sum, a) => sum + (Number(a.time_taken_ms) || 0), 0);
      const avgTimeSeconds = total > 0 ? Number((totalTime / total / 1000).toFixed(1)) : 0;

      const optionStats: OptionStat[] = (q.options || []).map(opt => {
        const chosenCount = qAnswers.filter(a => a.selected_option_id === opt.id).length;
        const optPercentage = total > 0 ? Math.round((chosenCount / total) * 100) : 0;
        return {
          optionId: opt.id,
          optionText: opt.text,
          isCorrect: opt.isCorrect,
          color: opt.color,
          shape: opt.shape,
          count: chosenCount,
          percentage: optPercentage,
        };
      });

      let difficulty: 'hard' | 'medium' | 'easy' = 'medium';
      if (accuracy < 50) {
        difficulty = 'hard';
      } else if (accuracy >= 75) {
        difficulty = 'easy';
      }

      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        imageUrl: q.imageUrl,
        orderIndex: index,
        totalAnswers: total,
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        accuracyPercentage: accuracy,
        avgTimeSeconds,
        difficulty,
        options: optionStats,
      };
    }).sort((a, b) => a.accuracyPercentage - b.accuracyPercentage);
  },
};
