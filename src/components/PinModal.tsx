import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, X, Dices, ArrowRight } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (pin: string, nickname: string, avatar: string) => void;
  initialNickname?: string;
  initialAvatar?: string;
}

const AVATAR_OPTIONS = ['🦊', '🦁', '🐼', '🚀', '⚡', '👑', '🦄', '🎮', '🐯', '🔥', '🤖', '🦖', '🌟', '🎯', '🍿', '🎬'];
const RANDOM_NAMES = [
  'SuperNinja', 'AstroLobo', 'PixelGamer', 'MasterQuiz', 'CyberPanda',
  'FuegoRápido', 'Quantum', 'CapitánSpark', 'NovaStar', 'MenteBrillante'
];

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  initialNickname = '',
  initialAvatar = '🦊',
}) => {
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState(initialNickname);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || pin.trim().length < 6) {
      setError('Por favor ingresa un PIN válido de 6 dígitos.');
      return;
    }
    if (!nickname.trim()) {
      setError('Por favor ingresa tu nombre o apodo.');
      return;
    }
    setError('');
    onJoin(pin.trim(), nickname.trim(), avatar);
    onClose();
  };

  const handleRandomize = () => {
    const randomNick = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const randomAv = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
    setNickname(randomNick);
    setAvatar(randomAv);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-b from-[#0e172f] via-[#091024] to-[#040815] border-2 border-amber-400/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white my-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center font-black shadow-md">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-white">
                Unirse con Código PIN
              </h3>
              <p className="text-[11px] text-white/50">
                Sala multijugador en vivo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-amber-300 block mb-1">
              Código PIN de la Sala (6 dígitos)
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              className="w-full text-center text-3xl font-black tracking-widest py-3 px-4 rounded-2xl bg-black/50 border-2 border-white/20 focus:border-amber-400 text-white font-mono uppercase focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-white/70 block mb-1">
              Tu Identificador en el Juego
            </label>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <select
                  value={avatar}
                  onChange={e => setAvatar(e.target.value)}
                  className="w-full text-xl py-2.5 rounded-xl bg-black/40 border border-white/20 text-center text-white focus:outline-none"
                >
                  {AVATAR_OPTIONS.map(a => (
                    <option key={a} value={a} className="bg-gray-900">
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-7">
                <input
                  type="text"
                  placeholder="Tu nombre..."
                  value={nickname}
                  onChange={e => {
                    setNickname(e.target.value);
                    setError('');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/20 text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="col-span-2">
                <button
                  type="button"
                  onClick={handleRandomize}
                  title="Generar aleatorio"
                  className="w-full h-full rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 flex items-center justify-center transition border border-white/10"
                >
                  <Dices className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs font-bold">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl btn-cinepolis-gold text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg mt-2"
          >
            <span>¡Ingresar a la Sala!</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
