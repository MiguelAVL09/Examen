import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { Quiz, UserAccount } from '../types/quiz';
import { quizService } from '../services/quizService';

export function SurveyStartDialog({ quiz, user, initialName, onClose, onStart }: {
  quiz: Quiz;
  user?: UserAccount | null;
  initialName: string;
  onClose: () => void;
  onStart: (name: string) => Promise<string | undefined>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needsName = !user && !quiz.isAnonymousSurvey;
  const access = quizService.isExamAccessible(quiz);
  const questions = quiz.questions.length;

  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog ref={ref} className="survey-start-dialog" aria-labelledby="survey-start-heading" onCancel={event => {
      event.preventDefault();
      if (!busy) onClose();
    }}>
      <div className="survey-start-heading">
        <h2 id="survey-start-heading">Responder encuesta</h2>
        <button type="button" className="drawer-close" aria-label="Cerrar encuesta" disabled={busy} onClick={onClose}><X size={22} aria-hidden="true" /></button>
      </div>
      <p className="survey-start-title">{quiz.title}</p>
      <p>{questions} {questions === 1 ? 'pregunta' : 'preguntas'}.{quiz.isAnonymousSurvey && ' La encuesta es anónima.'}</p>
      {user && <p>{quiz.isAnonymousSurvey
        ? 'Expertos registra que completaste la encuesta. Tus respuestas se guardan por separado de tu cuenta.'
        : 'Al enviar tus respuestas, la encuesta se marcará como completada en Expertos.'}</p>}
      <form onSubmit={async event => {
        event.preventDefault();
        if (busy || !access.accessible || !questions) return;
        setBusy(true);
        try {
          setError(await onStart(user ? user.name || user.nickname : name.trim() || (quiz.isAnonymousSurvey ? 'Participante' : '')) || '');
        } catch {
          setError('No se pudo abrir la encuesta. Intenta nuevamente.');
        } finally {
          setBusy(false);
        }
      }}>
        {needsName && <label>Tu nombre y apellido
          <input value={name} onChange={event => setName(event.target.value)} autoComplete="name" required maxLength={100} />
        </label>}
        {(!access.accessible || !questions || error) && <p className="survey-start-error" role="alert">{error || access.reason || 'Esta encuesta aún no tiene preguntas.'}</p>}
        <div className="survey-start-actions">
          <button type="button" className="quiz-action" disabled={busy} onClick={onClose}>Cancelar</button>
          {access.accessible && questions > 0 && <button type="submit" className="quiz-action quiz-action-primary" disabled={busy}>{busy ? 'Abriendo…' : 'Comenzar encuesta'} <ArrowRight size={18} aria-hidden="true" /></button>}
        </div>
      </form>
    </dialog>
  );
}
