import type { Question, QuestionOption, OptionColor, OptionShape } from '../types/quiz';

// =====================================================================
// Utilidades de seguridad, privacidad y anti-trampas
// =====================================================================

const DEVICE_ID_KEY = 'cinepolis_device_id_v1';

/** Hash FNV-1a de 32 bits (rápido y suficiente para una huella no criptográfica) */
const fnv1a = (str: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};

/**
 * Huella digital del dispositivo. Combina un identificador persistente (localStorage)
 * con rasgos estables del navegador. No contiene datos personales: solo un hash.
 * Formato: "<idPersistente>-<hashHardware>"
 */
export const getDeviceFingerprint = (): string => {
  let persistent = '';
  try {
    persistent = localStorage.getItem(DEVICE_ID_KEY) || '';
    if (!persistent) {
      persistent =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(16).slice(2, 10);
      localStorage.setItem(DEVICE_ID_KEY, persistent);
    }
  } catch {
    persistent = 'nostore';
  }

  let traits = '';
  try {
    const nav = navigator as any;
    traits = [
      nav.userAgent,
      nav.language,
      nav.platform,
      nav.hardwareConcurrency,
      nav.deviceMemory,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      window.devicePixelRatio,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      'ontouchstart' in window ? 'touch' : 'mouse',
    ].join('|');
  } catch {}

  return `${persistent}-${fnv1a(traits)}`;
};

/** Parte de hardware de la huella (sobrevive a borrar caché/localStorage) */
export const getHardwareHash = (deviceId?: string): string =>
  deviceId ? deviceId.split('-').slice(-1)[0] : '';

/** Fisher-Yates */
export const shuffleArray = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const PALETTE: { color: OptionColor; shape: OptionShape }[] = [
  { color: 'red', shape: 'triangle' },
  { color: 'blue', shape: 'diamond' },
  { color: 'yellow', shape: 'circle' },
  { color: 'green', shape: 'square' },
];

/**
 * Anti-copia vecinal: desordena preguntas y opciones y REASIGNA color/forma según la
 * nueva posición, para que dos compañeros no puedan copiarse por color o por letra.
 * Los IDs se conservan, así que el registro de respuestas y las analíticas no cambian.
 * Verdadero/Falso y Puzzle conservan el orden de sus opciones (es lo natural para el jugador).
 */
export const shuffleQuizQuestions = (questions: Question[]): Question[] =>
  shuffleArray(questions).map(q => {
    if (q.questionType === 'true_false' || q.questionType === 'puzzle' || q.questionType === 'type_answer') {
      return q;
    }
    const shuffledOpts: QuestionOption[] = shuffleArray(q.options || []).map((opt, idx) => ({
      ...opt,
      color: PALETTE[idx % PALETTE.length].color,
      shape: PALETTE[idx % PALETTE.length].shape,
    }));
    return { ...q, options: shuffledOpts };
  });

export type PrivacyMode = 'normal' | 'surname' | 'avatar';

/**
 * Modo proyección segura.
 * - normal:  "Carmen Yurisa Vázquez López"
 * - surname: "Carmen V."   (oculta apellidos, deja inicial)
 * - avatar:  "Participante #3"
 */
export const maskName = (name: string, mode: PrivacyMode, position?: number): string => {
  if (mode === 'normal' || !name) return name;
  if (mode === 'avatar') return position ? `Participante #${position}` : 'Participante';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length > 3 ? `${parts[0].slice(0, 3)}***` : parts[0];
  }
  // Nombre + inicial del primer apellido (si hay 4 palabras se asume 2 nombres + 2 apellidos)
  const surnameIdx = parts.length >= 4 ? 2 : 1;
  const firstNames = parts.slice(0, surnameIdx).join(' ');
  return `${firstNames} ${parts[surnameIdx].charAt(0).toUpperCase()}.`;
};

/** Vibración háptica segura (no hace nada si el dispositivo no la soporta) */
export const haptic = (pattern: number | number[]) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
};
