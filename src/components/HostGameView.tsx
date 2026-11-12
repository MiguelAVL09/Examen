import { useEffect, useRef, useState } from 'react';
import { Copy, Users } from 'lucide-react';
import type { Participant, Quiz, QuizSession } from '../types/quiz';
import { quizService } from '../services/quizService';
import { copyLink } from '../utils/platform';

interface HostGameViewProps {
  quiz: Quiz;
  room: QuizSession | null;
  onRoomCreated: (room: QuizSession) => void;
  onExit: () => void;
}

export function HostGameView({ quiz, room, onRoomCreated, onExit }: HostGameViewProps) {
  const creation = useRef<Promise<QuizSession> | null>(null);
  const [retry, setRetry] = useState(0);
  const [results, setResults] = useState<Participant[]>([]);
  const [roomError, setRoomError] = useState('');
  const [resultsError, setResultsError] = useState(false);
  const [notice, setNotice] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (room) return;
    let active = true;
    creation.current ??= quizService.createLiveSession(quiz.id);
    void creation.current.then(created => {
      if (active) onRoomCreated(created);
    }, () => {
      if (active) setRoomError('No se pudo crear la sala. Revisa tu conexión.');
    });
    return () => { active = false; };
  }, [quiz.id, room, onRoomCreated, retry]);

  useEffect(() => {
    if (!room) return;
    const roomId = room.id;
    let active = true;
    let loading = false;
    async function loadResults() {
      if (loading) return;
      loading = true;
      try {
        const entries = await quizService.getRoomResults(roomId);
        if (active) {
          setResults(entries);
          setResultsError(false);
        }
      } catch {
        if (active) setResultsError(true);
      } finally {
        loading = false;
      }
    }
    void loadResults();
    const timer = room.status === 'lobby' ? window.setInterval(loadResults, 4000) : undefined;
    return () => { active = false; window.clearInterval(timer); };
  }, [room]);

  async function closeRoom() {
    if (!room || closing) return;
    setClosing(true);
    setRoomError('');
    try {
      await quizService.closeRoom(room.id);
      onRoomCreated({ ...room, status: 'finished' });
    } catch {
      setRoomError('No se pudo cerrar la sala. Vuelve a intentarlo.');
    } finally {
      setClosing(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 text-white">
      <div className="rounded-3xl border border-white/15 bg-slate-950/80 p-5 sm:p-8">
        <h1 className="text-2xl font-black">{quiz.title}</h1>
        {room ? (
          <>
            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
              <h2 className="text-lg font-bold">{room.status === 'lobby' ? 'PIN de la sala' : 'Sala cerrada'}</h2>
              {room.status === 'lobby' && <>
                <p className="my-2 font-mono text-4xl font-black tracking-widest text-amber-300">{room.pin}</p>
                <p className="mb-4 text-sm text-white/80">Comparte el PIN. Cada colaborador puede abrir la actividad desde Menú, en Unirme con PIN, y responder a su ritmo.</p>
                <button type="button" className="quiz-action" onClick={async () => {
                  try {
                    await copyLink(room.pin);
                    setNotice('PIN copiado.');
                  } catch {
                    setNotice('Puedes compartir el PIN que aparece arriba.');
                  }
                }}><Copy size={18} aria-hidden="true" /> Copiar PIN</button>
                <p className="mt-2 text-sm" role="status">{notice}</p>
              </>}
            </div>
            <h2 className="mt-6 flex items-center gap-2 text-lg font-bold"><Users size={20} aria-hidden="true" /> Resultados de la sala</h2>
            {resultsError && <p role="alert" className="mt-2 text-amber-200">No se pudieron actualizar los resultados.</p>}
            {results.length ? (
              <ol className="mt-3 divide-y divide-white/10">
                {results.map(result => <li key={result.id} className="flex justify-between gap-3 py-3">
                  <span>{result.avatar} {result.nickname}</span>
                  <strong>{result.totalScore.toLocaleString('es-MX')} pts</strong>
                </li>)}
              </ol>
            ) : <p className="mt-2 text-white/70">Aquí aparecerán las evaluaciones enviadas.</p>}
          </>
        ) : !roomError && <p className="mt-4" role="status">Creando la sala…</p>}
        {roomError && <p className="mt-4 text-amber-200" role="alert">{roomError}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {!room && roomError && <button type="button" className="quiz-action quiz-action-primary" onClick={() => {
            creation.current = null;
            setRoomError('');
            setRetry(retry + 1);
          }}>Reintentar</button>}
          {room?.status === 'lobby' && <button type="button" className="quiz-action quiz-action-primary" disabled={closing}
            onClick={() => void closeRoom()}>{closing ? 'Cerrando…' : 'Cerrar sala'}</button>}
          <button type="button" className="quiz-action" onClick={onExit}>Volver a encuestas</button>
        </div>
      </div>
    </section>
  );
}
