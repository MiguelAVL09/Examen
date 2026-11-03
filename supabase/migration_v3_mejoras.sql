-- =====================================================================
-- MIGRACIÓN V3 - MEJORAS CINÉPOLIS (Sucursal, Área, Anti-trampas, Fichas)
-- ---------------------------------------------------------------------
-- 100% SEGURA: solo AGREGA columnas nuevas. No borra ni modifica datos.
-- Se puede ejecutar varias veces sin problema (IF NOT EXISTS).
-- Pegar en: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- Datos nuevos de cada intento
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS tab_switches INTEGER DEFAULT 0;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS time_away_ms INTEGER DEFAULT 0;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Ficha formativa "¿Por qué es la correcta?" por pregunta
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Índices para reportes por sucursal / dispositivo
CREATE INDEX IF NOT EXISTS idx_participants_branch ON public.participants(quiz_id, branch);
CREATE INDEX IF NOT EXISTS idx_participants_device ON public.participants(device_id);

-- Refrescar el caché de esquema de la API de Supabase
NOTIFY pgrst, 'reload schema';
