import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Copy,
  Check,
  X,
  QrCode,
  Smartphone,
  ExternalLink,
  MessageCircle,
  Send
} from 'lucide-react';
import type { Quiz } from '../types/quiz';
import { soundEffects } from '../utils/soundEffects';

interface ShareQuizModalProps {
  quiz: Quiz;
  onClose: () => void;
}

export const ShareQuizModal: React.FC<ShareQuizModalProps> = ({ quiz, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showQR, setShowQR] = useState<boolean>(false);

  // Construir URL limpia para compartir
  const shareUrl = `${window.location.origin}/?quiz=${encodeURIComponent(quiz.id)}`;
  const shareText = `¡Te desafío a jugar este cuestionario de Kahoot: "${quiz.title}"! ¿Qué tan alto llegarás en el ranking? Entra aquí:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      soundEffects.playCorrect();
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: quiz.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // Ignorar si el usuario canceló el diálogo nativo
      }
    } else {
      handleCopyLink();
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&format=svg&data=${encodeURIComponent(
    shareUrl
  )}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-kahoot-purple-dark border border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-white"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-kahoot-yellow text-black rounded-2xl shadow-lg">
              <Share2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                Compartir Cuestionario
              </h3>
              <p className="text-xs sm:text-sm text-white/70 font-semibold">
                Envía el enlace para que tus participantes jueguen directamente.
              </p>
            </div>
          </div>

          {/* Quiz Preview Card */}
          <div className="bg-black/40 rounded-2xl p-4 border border-white/10 flex items-center gap-4 mb-6">
            <img
              src={quiz.coverImage || '/cinepolis-cover.jpg'}
              alt={quiz.title}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-white/20 shadow-md flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-kahoot-yellow text-black inline-block mb-1">
                {quiz.category || 'General'}
              </span>
              <h4 className="text-sm sm:text-base font-black text-white truncate">
                {quiz.title}
              </h4>
              <p className="text-xs text-white/60 font-semibold mt-0.5">
                {quiz.questions?.length || 0} Preguntas • ⏱ {quiz.timePerQuestion || 20}s
              </p>
            </div>
          </div>

          {/* Direct Link Copy Field */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-black uppercase tracking-wider text-amber-300 block">
              Enlace Directo del Cuestionario
            </label>
            <div className="flex items-center gap-2 bg-black/60 p-2 rounded-2xl border border-white/20">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white font-mono focus:outline-none select-all truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-kahoot-yellow hover:bg-amber-400 text-black'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 stroke-[2.5]" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social & Direct Apps Sharing */}
          <div className="space-y-3 mb-6">
            <span className="text-xs font-bold text-white/60 block uppercase tracking-wider">
              Compartir en Redes y Mensajería:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `${shareText}\n${shareUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 flex flex-col items-center justify-center gap-1 text-xs font-bold transition active:scale-95"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <span>WhatsApp</span>
              </a>

              {/* Telegram */}
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(
                  shareUrl
                )}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/40 text-sky-200 flex flex-col items-center justify-center gap-1 text-xs font-bold transition active:scale-95"
              >
                <Send className="w-5 h-5 text-sky-400" />
                <span>Telegram</span>
              </a>

              {/* Twitter / X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  shareText
                )}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-white flex flex-col items-center justify-center gap-1 text-xs font-bold transition active:scale-95"
              >
                <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>X / Twitter</span>
              </a>

              {/* QR Code Toggle */}
              <button
                onClick={() => setShowQR(!showQR)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition active:scale-95 ${
                  showQR
                    ? 'bg-amber-400 text-black border-amber-400 shadow'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>Código QR</span>
              </button>
            </div>
          </div>

          {/* QR Code Display (Collapsible) */}
          {showQR && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center gap-3 mb-6 shadow-inner text-black"
            >
              <img
                src={qrImageUrl}
                alt={`Código QR para ${quiz.title}`}
                className="w-48 h-48 rounded-lg shadow"
              />
              <p className="text-xs text-gray-700 font-bold text-center">
                ¡Escanea con la cámara de tu celular para entrar a jugar al instante!
              </p>
            </motion.div>
          )}

          {/* Mobile Native Share Button if supported */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-white/20 transition active:scale-95 mb-4"
            >
              <Smartphone className="w-4 h-4 text-kahoot-yellow" />
              <span>Compartir con aplicaciones de tu teléfono</span>
            </button>
          )}

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase tracking-wider transition"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
