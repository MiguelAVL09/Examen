import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, IdCard, LockKeyhole } from 'lucide-react';
import { authService } from '../services/authService';
import './AuthScreen.css';

type Mode = 'login' | 'register' | 'recover';

const titles: Record<Mode, string> = {
  login: 'Inicia sesión',
  register: 'Crea tu cuenta',
  recover: 'Recupera tu contraseña',
};

const descriptions: Record<Mode, string> = {
  login: 'Usa tu ID de empleado y tu contraseña.',
  register: 'Usa el número que aparece en tu credencial de empleado.',
  recover: 'Ingresa tu ID para consultar tu pregunta de seguridad.',
};

function Brand() {
  return <span className="auth-brand"><span aria-hidden="true">C!</span> Cinépolis <strong>PRO</strong></span>;
}

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => boolean }) {
  const [mode, setMode] = useState<Mode>('login');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const modeChanged = useRef(false);

  useEffect(() => {
    if (modeChanged.current) heading.current?.focus();
  }, [mode]);

  function changeMode(next: Mode) {
    modeChanged.current = true;
    setMode(next);
    setQuestion('');
    setShowPassword(false);
    setError('');
    setStatus('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? '');
    const id = employeeNumber.trim();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (mode === 'recover') {
        if (!question) {
          const result = await authService.getSecurityQuestion(id);
          if (result.success && result.question) setQuestion(result.question);
          else setError(result.error || 'No se pudo consultar tu pregunta de seguridad.');
        } else {
          const result = await authService.recoverPasswordWithQuestion(id, value('securityAnswer'), value('password'));
          if (result.success) {
            changeMode('login');
            setStatus('Contraseña restablecida. Ya puedes iniciar sesión.');
          } else setError(result.error || 'No se pudo restablecer tu contraseña.');
        }
        return;
      }

      const result = mode === 'register' ? await authService.register({
        name: value('name'),
        employeeNumber: id,
        department: value('department'),
        password: value('password'),
        securityQuestion: value('securityQuestion'),
        securityAnswer: value('securityAnswer'),
      }) : await authService.login(id, value('password'));

      if (!result.success) setError(result.error || 'No se pudo iniciar sesión.');
      else if (!onAuthenticated()) setError('El navegador no pudo abrir la sesión. Intenta de nuevo.');
    } catch {
      setError('No se pudo completar la solicitud. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  const showPasswordField = mode !== 'recover' || Boolean(question);

  return (
    <main className="auth-page">
      <section className="auth-stage" aria-label="Cinépolis PRO">
        <div className="auth-stage-image" aria-hidden="true" />
        <div className="auth-projection" aria-hidden="true" />
        <div className="auth-curtains" aria-hidden="true"><span /><span /></div>
        <div className="auth-stage-copy">
          <Brand />
          <p>Encuestas y<br />capacitación</p>
        </div>
      </section>

      <section className="auth-main" aria-labelledby="auth-heading">
        <div className="auth-card">
          <div className="auth-form-content" key={mode}>
            {mode !== 'login' && <button type="button" className="auth-link auth-back" disabled={busy} onClick={() => changeMode('login')}>
              <ArrowLeft size={18} aria-hidden="true" /> Volver a iniciar sesión
            </button>}
            <h1 id="auth-heading" tabIndex={-1} ref={heading}>{titles[mode]}</h1>
            <p className="auth-intro">{mode === 'recover' && question ? 'Responde tu pregunta y elige una contraseña nueva.' : descriptions[mode]}</p>

            <form className="auth-form" onSubmit={submit} aria-busy={busy}>
              {mode === 'register' && <label>Nombre completo
                <input name="name" autoComplete="name" required maxLength={100} />
              </label>}
              <label>ID de empleado
                <span className="auth-field">
                  <IdCard size={20} aria-hidden="true" />
                  <input name="employeeNumber" autoComplete="username" value={employeeNumber}
                    onChange={event => { setEmployeeNumber(event.target.value); setError(''); }}
                    readOnly={Boolean(question)} required maxLength={30} placeholder="Ej. 001234" spellCheck={false} />
                </span>
              </label>
              {mode === 'register' && <label>Área <small>(opcional)</small>
                <input name="department" maxLength={60} placeholder="Ej. Dulcería" />
              </label>}
              {mode === 'recover' && question && <label>{question}
                <input name="securityAnswer" required autoComplete="off" />
              </label>}
              {showPasswordField && <div>
                <label htmlFor="auth-password">{mode === 'recover' ? 'Nueva contraseña' : 'Contraseña'}</label>
                <span className="auth-field">
                  <LockKeyhole size={19} aria-hidden="true" />
                  <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    aria-describedby={mode === 'login' ? undefined : 'auth-password-help'}
                    required minLength={mode === 'login' ? undefined : 6} maxLength={128} />
                  <button type="button" className="auth-show" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                </span>
                {mode !== 'login' && <small className="auth-hint" id="auth-password-help">Usa al menos 6 caracteres.</small>}
              </div>}
              {mode === 'register' && <details className="auth-recovery-options">
                <summary>Agregar una pregunta de recuperación</summary>
                <label>Pregunta de seguridad
                  <select name="securityQuestion">
                    <option>¿Cuál es tu película favorita?</option>
                    <option>¿Cuál es el nombre de tu primera mascota?</option>
                    <option>¿Cuál era tu materia favorita en la escuela?</option>
                  </select>
                </label>
                <label>Tu respuesta<input name="securityAnswer" autoComplete="off" maxLength={120} /></label>
              </details>}
              {error && <p className="auth-alert" role="alert">{error}</p>}
              {status && <p className="auth-success" role="status">{status}</p>}
              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : question ? 'Guardar contraseña' : 'Continuar'}
                <ArrowRight size={21} aria-hidden="true" />
              </button>
            </form>

            {mode === 'login' && <div className="auth-links">
              <button type="button" className="auth-link" disabled={busy} onClick={() => changeMode('recover')}>Olvidé mi contraseña</button>
              <button type="button" className="auth-link" disabled={busy} onClick={() => changeMode('register')}>Crear cuenta</button>
            </div>}
          </div>
        </div>
      </section>
    </main>
  );
}
