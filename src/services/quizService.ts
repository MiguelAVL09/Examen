import type { Quiz, Participant, QuizSession } from '../types/quiz';
import { supabase, isSupabaseConfigured } from './supabaseClient';

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
            "id": "5e41db1e-9979-49f0-862d-574d5ece336f",
            "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
            "questionText": "“(Nombre), te entrego tu recibo de compra. Actualmente cuentas con X puntos Club Cinépolis”, ¿Es la correcta despedida?",
            "timeLimit": 20,
            "pointsMultiplier": 1,
            "questionType": "true_false",
            "options": [
                  {
                        "id": "8a211ba7-576e-47c8-a8bf-1bfa3aa0ca86",
                        "text": "VERDADERO",
                        "isCorrect": true,
                        "color": "blue",
                        "shape": "diamond",
                        "orderIndex": 0
                  },
                  {
                        "id": "2924ea7e-3868-4d0a-8e2c-81ba1663159b",
                        "text": "FALSO",
                        "isCorrect": false,
                        "color": "red",
                        "shape": "triangle",
                        "orderIndex": 1
                  }
            ],
            "imageUrl": "/question-images/cinepolis-q2.jpg",
            "orderIndex": 1
      },
      {
            "id": "dfe09e40-0ce7-466f-81fe-f150e7f6e87c",
            "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
            "questionText": "¿Cuáles son los 3 requisitos para sacar la Tarjeta de Credito Openbank?",
            "timeLimit": 20,
            "pointsMultiplier": 1,
            "questionType": "multiple_choice",
            "options": [
                  {
                        "id": "621b57b2-ef3a-4302-88f8-7fe380e67505",
                        "text": "Club Cinepolis, INE, Correo Electronico",
                        "isCorrect": false,
                        "color": "red",
                        "shape": "triangle",
                        "orderIndex": 0
                  },
                  {
                        "id": "dace8432-8a7d-445f-bb2e-5e6a4e1d1b7c",
                        "text": "Solo tu INE",
                        "isCorrect": false,
                        "color": "blue",
                        "shape": "diamond",
                        "orderIndex": 1
                  },
                  {
                        "id": "57d409e4-6c8f-41ea-89ca-36254b5d4e6d",
                        "text": "Num de teléfono, Correo Electrónico, INE",
                        "isCorrect": true,
                        "color": "yellow",
                        "shape": "circle",
                        "orderIndex": 2
                  },
                  {
                        "id": "34fc25ac-fd08-4a0c-aa08-0641325d3756",
                        "text": "Solo tu correosolo tu correo",
                        "isCorrect": false,
                        "color": "green",
                        "shape": "square",
                        "orderIndex": 3
                  }
            ],
            "imageUrl": "/question-images/cinepolis-q3.jpg",
            "orderIndex": 2
      },
      {
            "id": "e0d425b4-d943-44f0-96ea-b914234a7c4b",
            "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
            "questionText": "Cuando juntas las visitas necesarias para subir de nivel el cambio se refleja al terminar el semestre",
            "timeLimit": 20,
            "pointsMultiplier": 1,
            "questionType": "true_false",
            "options": [
                  {
                        "id": "3194a49c-8861-41a1-996c-ca6352b28e69",
                        "text": "VERDADERO",
                        "isCorrect": false,
                        "color": "blue",
                        "shape": "diamond",
                        "orderIndex": 0
                  },
                  {
                        "id": "4d11f91c-ee42-4f9e-8254-bf493a13b9de",
                        "text": "FALSO",
                        "isCorrect": true,
                        "color": "red",
                        "shape": "triangle",
                        "orderIndex": 1
                  }
            ],
            "imageUrl": "/question-images/cinepolis-q4.jpg",
            "orderIndex": 3
      },
      {
            "id": "97fd7088-a41b-48c0-b135-494137ea53e1",
            "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
            "questionText": "¿Cuál NO es un requisito de afiliacion del cliente con una tarjeta club?",
            "timeLimit": 20,
            "pointsMultiplier": 1,
            "questionType": "multiple_choice",
            "options": [
                  {
                        "id": "03b09885-00ce-41b5-b437-84c1ce57ced5",
                        "text": "Correo",
                        "isCorrect": false,
                        "color": "red",
                        "shape": "triangle",
                        "orderIndex": 0
                  },
                  {
                        "id": "fa4c6c7c-923d-4e35-a99c-6c6ca9e389a5",
                        "text": "Código Postal",
                        "isCorrect": false,
                        "color": "blue",
                        "shape": "diamond",
                        "orderIndex": 1
                  },
                  {
                        "id": "76ec87ce-7c27-40ff-a2a4-5f6bd7160d9d",
                        "text": "RFC",
                        "isCorrect": true,
                        "color": "yellow",
                        "shape": "circle",
                        "orderIndex": 2
                  },
                  {
                        "id": "8a870068-3711-4dfc-888c-41b796db8aeb",
                        "text": "Número de teléfono",
                        "isCorrect": false,
                        "color": "green",
                        "shape": "square",
                        "orderIndex": 3
                  }
            ],
            "imageUrl": "/question-images/cinepolis-q5.jpg",
            "orderIndex": 4
      },
      {
            "id": "6175df64-a0ef-45d6-a71e-75abf7e982fe",
            "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
            "questionText": "¿Cuál es el primer beneficio que se genera al tramitar tu club cinepolis?",
            "timeLimit": 20,
            "pointsMultiplier": 1,
            "questionType": "multiple_choice",
            "options": [
                  {
                        "id": "8d00de83-2947-403b-a446-ad18931e5575",
                        "text": "1 boleto gratis en la compra de otro",
                        "isCorrect": true,
                        "color": "red",
                        "shape": "triangle",
                        "orderIndex": 0
                  },
                  {
                        "id": "182bdbca-3974-4dc2-ab08-823577620fc3",
                        "text": "Combo en descuento",
                        "isCorrect": false,
                        "color": "blue",
                        "shape": "diamond",
                        "orderIndex": 1
                  },
                  {
                        "id": "62a6b9cb-0e7b-4fce-a3aa-404c7db11bc7",
                        "text": "50 puntos de cortesía",
                        "isCorrect": false,
                        "color": "yellow",
                        "shape": "circle",
                        "orderIndex": 2
                  },
                  {
                        "id": "413b6d09-83df-42a9-9ac9-5ee28cfbf731",
                        "text": "Ningún beneficio hasta acumular puntos o visitas",
                        "isCorrect": false,
                        "color": "green",
                        "shape": "square",
                        "orderIndex": 3
                  }
            ],
            "imageUrl": "/question-images/cinepolis-q6.jpg",
            "orderIndex": 5
      },
      {
            "id": "2738e13b-884f-4134-91f2-52fae0a0290d",
            "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
            "questionText": "Una persona no puede ser creativa en el área, debe acatarse a las reglas",
            "timeLimit": 20,
            "pointsMultiplier": 1,
            "questionType": "true_false",
            "options": [
                  {
                        "id": "3b750c0e-c738-44c8-b00e-b6deadf78c72",
                        "text": "VERDADERO",
                        "isCorrect": false,
                        "color": "blue",
                        "shape": "diamond",
                        "orderIndex": 0
                  },
                  {
                        "id": "efb2f68c-aeff-4c5e-819b-3ad12edf0f6d",
                        "text": "FALSO",
                        "isCorrect": true,
                        "color": "red",
                        "shape": "triangle",
                        "orderIndex": 1
                  }
            ],
            "imageUrl": "/question-images/cinepolis-q7.jpg",
            "orderIndex": 6
      },
      {
            "id": "b43c79a7-efe6-4940-8738-f502ebc3ec9b",
            "quizId": "f3f7aa07-4389-4769-a162-3fb8b989bfc0",
            "questionText": "Todos tenemos un dominio, un área o campo en el qué sobre salimos más",
            "timeLimit": 20,
            "pointsMultiplier": 1,
            "questionType": "true_false",
            "options": [
                  {
                        "id": "0937a502-e9bd-46f9-aec0-6fda03a6cbde",
                        "text": "VERDADERO",
                        "isCorrect": true,
                        "color": "blue",
                        "shape": "diamond",
                        "orderIndex": 0
                  },
                  {
                        "id": "13fe8bf6-9ce0-4e43-b7b7-034ea61a05e7",
                        "text": "FALSO",
                        "isCorrect": false,
                        "color": "red",
                        "shape": "triangle",
                        "orderIndex": 1
                  }
            ],
            "imageUrl": "/question-images/cinepolis-q8.jpg",
            "orderIndex": 7
      }
],
  },
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
