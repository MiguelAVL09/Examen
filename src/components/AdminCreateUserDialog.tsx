import { useEffect, useRef, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { authService } from '../services/authService';
import type { UserAccount, UserRole } from '../types/quiz';

const fieldClass = 'mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none';

export function AdminCreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (user: UserAccount) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby="new-account-title" onCancel={event => {
      event.preventDefault();
      if (!busy) onClose();
    }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-3xl border-2 border-white/20 bg-kahoot-purple-dark p-5 text-white shadow-2xl backdrop:bg-black/80 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-amber-400/20 p-2 text-amber-300"><UserPlus size={20} /></span>
          <h3 id="new-account-title" className="text-lg font-black">Dar de alta usuario</h3>
        </div>
        <button type="button" aria-label="Cerrar alta de usuario" disabled={busy} onClick={onClose} className="rounded-lg p-2 text-white/70 hover:bg-white/10"><X size={19} /></button>
      </header>
      <form onSubmit={async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const value = (field: string) => String(form.get(field) ?? '').trim();
        const employeeNumber = value('employeeNumber');
        setBusy(true);
        setError('');
        try {
          const result = await authService.createUserByAdmin({
            name: value('name'), employeeNumber, department: value('department'), password: value('password'),
          }, value('role') as UserRole);
          if (result.success && result.user) onCreated(result.user);
          else setError(result.error || 'No se pudo crear la cuenta.');
        } catch {
          setError('No se pudo crear la cuenta. Vuelve a intentarlo.');
        } finally {
          setBusy(false);
        }
      }} className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold sm:col-span-2">Nombre completo
          <input name="name" required maxLength={100} autoComplete="off" className={fieldClass} />
        </label>
        <label className="text-xs font-bold">ID de empleado
          <input name="employeeNumber" required maxLength={30} placeholder="Ej. 001234" autoComplete="off" className={fieldClass} />
          <span className="mt-1 block font-normal text-white/70">Se usará para iniciar sesión.</span>
        </label>
        <label className="text-xs font-bold">Área <span className="font-normal text-white/60">(opcional)</span>
          <input name="department" maxLength={60} placeholder="Operaciones" className={fieldClass} />
        </label>
        <label className="text-xs font-bold">Rol en la plataforma
          <select name="role" defaultValue="user" className={fieldClass}>
            <option value="user">Colaborador</option>
            <option value="expert">Cinepolito Experto</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <label className="text-xs font-bold">Contraseña inicial
          <input name="password" type="password" required minLength={6} maxLength={128} autoComplete="new-password" className={fieldClass} />
          <span className="mt-1 block font-normal text-white/70">Mínimo 6 caracteres.</span>
        </label>
        {error && <p className="rounded-lg bg-red-950/70 p-2 text-sm text-red-200 sm:col-span-2" role="alert">{error}</p>}
        <div className="mt-1 flex flex-wrap justify-end gap-2.5 border-t border-white/10 pt-3 sm:col-span-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20">Cancelar</button>
          <button disabled={busy} className="btn-cinepolis-gold rounded-xl px-5 py-2 text-xs font-black text-black disabled:opacity-60">{busy ? 'Creando…' : 'Crear cuenta'}</button>
        </div>
      </form>
    </dialog>
  );
}
