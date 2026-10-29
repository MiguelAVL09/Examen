-- =====================================================================
-- ESQUEMA SUPABASE ACTUALIZADO PARA KAHOOT QUIZ APP (V2)
-- Soporta: Opción Múltiple, Verdadero/Falso, Puzzle y Escribir Respuesta
-- Copia y pega este script en el SQL Editor de tu proyecto en Supabase
-- (https://supabase.com/dashboard/project/_/sql)
-- =====================================================================

-- 1. Habilitar extensión pgcrypto para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabla de Cuestionarios (Quizzes)
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    category TEXT DEFAULT 'General',
    time_per_question INTEGER DEFAULT 20,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Preguntas (Questions) con soporte Multi-Tipo
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    time_limit INTEGER DEFAULT 20,
    points_multiplier NUMERIC DEFAULT 1.0,
    -- Tipos admitidos: 'multiple_choice', 'true_false', 'puzzle', 'type_answer'
    question_type TEXT DEFAULT 'multiple_choice',
    correct_order JSONB DEFAULT NULL,      -- Para 'puzzle': array de IDs en orden correcto
    accepted_answers JSONB DEFAULT NULL,   -- Para 'type_answer': array de respuestas textuales válidas
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de Opciones de Respuesta (Question Options)
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    color TEXT NOT NULL, -- 'red', 'blue', 'yellow', 'green'
    shape TEXT NOT NULL, -- 'triangle', 'diamond', 'circle', 'square'
    order_index INTEGER DEFAULT 0
);

-- 5. Tabla de Sesiones de Juego en Vivo (Quiz Sessions / PIN)
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    pin TEXT NOT NULL,
    status TEXT DEFAULT 'lobby', -- 'lobby', 'question', 'answers_reveal', 'leaderboard', 'finished'
    current_question_index INTEGER DEFAULT 0,
    question_started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla de Participantes (Ranking & Resultados - Admin Only)
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE SET NULL,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    avatar TEXT DEFAULT '🦊',
    total_score INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    correct_answers_count INTEGER DEFAULT 0,
    total_questions_count INTEGER DEFAULT 0,
    accuracy_percentage NUMERIC DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabla de Respuestas Detalladas de Participantes
CREATE TABLE IF NOT EXISTS public.participant_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
    submitted_sequence JSONB DEFAULT NULL,
    submitted_text TEXT DEFAULT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    time_taken_ms INTEGER DEFAULT 0,
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Índices para consultas de alta velocidad y ranking
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON public.quizzes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_options_question_id ON public.question_options(question_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_participants_quiz_score ON public.participants(quiz_id, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_participants_session_score ON public.participants(session_id, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_pin ON public.quiz_sessions(pin);

-- 9. Políticas de Seguridad RLS (Row Level Security)
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Public Manage Quizzes" ON public.quizzes FOR ALL USING (true);

CREATE POLICY "Public Read Questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Public Manage Questions" ON public.questions FOR ALL USING (true);

CREATE POLICY "Public Read Options" ON public.question_options FOR SELECT USING (true);
CREATE POLICY "Public Manage Options" ON public.question_options FOR ALL USING (true);

CREATE POLICY "Public Read Sessions" ON public.quiz_sessions FOR SELECT USING (true);
CREATE POLICY "Public Manage Sessions" ON public.quiz_sessions FOR ALL USING (true);

CREATE POLICY "Public Insert Participants" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Participants" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Public Update Participants" ON public.participants FOR UPDATE USING (true);
CREATE POLICY "Public Delete Participants" ON public.participants FOR DELETE USING (true);

CREATE POLICY "Public Insert Answers" ON public.participant_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Answers" ON public.participant_answers FOR SELECT USING (true);
CREATE POLICY "Public Delete Answers" ON public.participant_answers FOR DELETE USING (true);

-- 10. Habilitar Supabase Realtime para salas de juego en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
