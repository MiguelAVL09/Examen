import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, X, ArrowRight } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (pin: string, avatar: string) => Promise<string | undefined>;
  initialAvatar?: string;
}

const avatars = ['🦊', '🦁', '🐼', '🚀', '⚡', '👑', '🦄', '🎮', '🐯', '🔥', '🤖', '🦖', '🌟', '🎯', '🍿', '🎬'];

export function PinModal({ isOpen, onClose, onJoin, initialAvatar = '🦊' }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState(initialAvatar);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  if (!isOpen) return null;

  function close() {
    setPin('');
    setError('');
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (joining) return;
    if (!/^\d{6}$/.test(pin)) {
      setError('Ingresa un PIN de seis dígitos.');
      return;
    }
    setError('');
    setJoining(true);
    try {
      const message = await onJoin(pin, avatar);
      if (message) setError(message);
      else close();
    } catch {
      setError('No se pudo consultar la sala. Vuelve a intentarlo.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <motion.section role="dialog" aria-modal="true" aria-labelledby="room-pin-title"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl border-2 border-amber-400/30 bg-slate-950 p-5 text-white sm:p-7">
        <header className="mb-5 flex items-center justify-between gap-3">
          <h2 id="room-pin-title" className="flex items-center gap-2 text-lg font-black">
            <Gamepad2 className="text-amber-300" aria-hidden="true" /> Unirme con PIN
          </h2>
          <button type="button" onClick={close} disabled={joining} aria-label="Cerrar"
            className="quiz-action min-w-11 px-2">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="room-pin" className="block font-semibold">PIN de la sala (6 dígitos)</label>
          <input id="room-pin" type="text" inputMode="numeric" maxLength={6} autoFocus value={pin} disabled={joining}
            onChange={event => { setPin(event.target.value.replace(/\D/g, '')); setError(''); }}
            className="w-full rounded-xl border border-white/30 bg-white/5 py-3 text-center font-mono text-3xl font-black tracking-widest focus:border-amber-400" />
          <div className="flex items-center gap-3">
            <label htmlFor="room-avatar" className="font-semibold">Avatar</label>
            <select id="room-avatar" value={avatar} onChange={event => setAvatar(event.target.value)} disabled={joining}
              className="rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-xl">
              {avatars.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          {error && <p role="alert" className="font-semibold text-amber-200">{error}</p>}
          <button type="submit" disabled={joining} className="quiz-action quiz-action-primary w-full">
            {joining ? 'Buscando sala…' : 'Ingresar a la sala'} <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      </motion.section>
    </div>
  );
}
