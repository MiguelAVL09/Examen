import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog } from '../TrackerDialogs';
import { publishExpertSurvey } from '../services/expertSurveyService';

const defaultOptions = ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo'];
const newQuestion = () => ({ id: crypto.randomUUID(), text: '', options: [...defaultOptions] });

export function ExpertSurveyEditor({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [id] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [questions, setQuestions] = useState(() => [newQuestion()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function changeQuestion(id: string, changes: { text?: string; options?: string[] }) {
    setQuestions(previous => previous.map(question => question.id === id ? { ...question, ...changes } : question));
  }

  return <Dialog title="Crear encuesta de Kahoot" subtitle="Al publicarla, estará disponible en la web y la app." onClose={onClose} busy={busy}>
    <form onSubmit={async event => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      setError('');
      try {
        await publishExpertSurvey({ id, title, description, anonymous, questions: questions.map(({ text, options }) => ({ text, options })) });
        onPublished();
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'No se pudo publicar la encuesta.');
      } finally {
        setBusy(false);
      }
    }}>
      <fieldset className="dialog-body survey-editor" disabled={busy}>
        <label>Título<input required value={title} maxLength={120} onChange={event => setTitle(event.target.value)} /></label>
        <label>Descripción <small>Opcional</small><textarea value={description} rows={2} maxLength={600} onChange={event => setDescription(event.target.value)} /></label>
        <label className="survey-anonymity"><input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)} /> Respuestas anónimas</label>
        {questions.map((question, index) => <fieldset className="survey-question" key={question.id}>
          <legend>Pregunta {index + 1}</legend>
          <label>Texto de la pregunta<textarea required rows={2} maxLength={300} value={question.text} onChange={event => changeQuestion(question.id, { text: event.target.value })} /></label>
          {question.options.map((option, optionIndex) => <div className="survey-option" key={optionIndex}>
            <label>Opción {optionIndex + 1}<input required value={option} maxLength={100} onChange={event => changeQuestion(question.id, {
              options: question.options.map((item, position) => position === optionIndex ? event.target.value : item),
            })} /></label>
            {question.options.length > 2 && <button type="button" className="icon-button" aria-label={`Quitar opción ${optionIndex + 1} de la pregunta ${index + 1}`}
              onClick={() => changeQuestion(question.id, { options: question.options.filter((_, position) => position !== optionIndex) })}><Trash2 size={16} /></button>}
          </div>)}
          <div className="survey-question-actions">
            {question.options.length < 5 && <button type="button" className="text-button" onClick={() => changeQuestion(question.id, { options: [...question.options, ''] })}>Agregar opción</button>}
            {questions.length > 1 && <button type="button" className="text-button" onClick={() => setQuestions(previous => previous.filter(item => item.id !== question.id))}>Quitar pregunta {index + 1}</button>}
          </div>
        </fieldset>)}
        {questions.length < 30 && <button type="button" className="button secondary" onClick={() => setQuestions(previous => [...previous, newQuestion()])}>
          <Plus size={16} aria-hidden="true" /> Agregar pregunta
        </button>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </fieldset>
      <footer className="dialog-actions">
        <div className="action-end">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className="button primary" disabled={busy}>{busy ? 'Publicando…' : 'Publicar encuesta'}</button>
        </div>
      </footer>
    </form>
  </Dialog>;
}
