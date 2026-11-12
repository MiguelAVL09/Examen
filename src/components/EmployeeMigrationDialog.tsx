import { useEffect, useRef, useState } from 'react';
import { getLocalAccountsForMigration, migrateLocalAccounts } from '../services/employeeMigration';
import { saveDocument } from '../utils/platform';
import { hasLocalWorkspaceToTransfer, transferLocalWorkspace } from '../services/sharedWorkspace';

const roleNames = { user: 'Colaborador', expert: 'Cinepolito Experto', admin: 'Administrador' };

export function EmployeeMigrationDialog({ onClose, onMigrated }: { onClose: () => void; onMigrated: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [preview] = useState(() => {
    try { return { accounts: getLocalAccountsForMigration(), error: '' }; }
    catch { return { accounts: [], error: 'No se pudo leer la lista de cuentas de este navegador.' }; }
  });
  const [selected, setSelected] = useState(() => new Set(preview.accounts.filter(account => account.eligible && account.role !== 'admin').map(account => account.id)));
  const [canTransferWorkspace, setCanTransferWorkspace] = useState(hasLocalWorkspaceToTransfer);
  const [includeWorkspace, setIncludeWorkspace] = useState(canTransferWorkspace);
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<string[]>([]);
  const [passwords, setPasswords] = useState<{ employeeNumber: string; password: string }[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function downloadPasswords() {
    const text = ['ID de empleado\tContraseña inicial', ...passwords.map(({ employeeNumber, password }) => `${employeeNumber}\t${password}`)].join('\r\n');
    void saveDocument(new Blob(['\uFEFF', text], { type: 'text/plain' }), 'cinepolis-accesos-iniciales.txt');
  }

  async function migrate() {
    setBusy(true);
    setDone(false);
    setFailures([]);
    try {
      const result = await migrateLocalAccounts(selected);
      setPasswords(previous => [...previous, ...result.passwords]);
      if (includeWorkspace) {
        try {
          await transferLocalWorkspace();
          setIncludeWorkspace(false);
          setCanTransferWorkspace(false);
        } catch {
          result.failures.push('No se pudieron trasladar los registros de Expertos. Puedes reintentar.');
        }
      }
      setFailures(result.failures);
      setDone(true);
      onMigrated();
    } catch {
      setFailures(['No se pudo iniciar la migración. Vuelve a intentarlo.']);
    } finally {
      setBusy(false);
    }
  }

  return <dialog ref={ref} aria-labelledby="employee-migration-title" className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-white/20 bg-kahoot-purple-dark p-6 text-white backdrop:bg-black/80" onCancel={event => {
    event.preventDefault();
    if (!busy) onClose();
  }}>
    <h3 id="employee-migration-title" className="text-lg font-black">Migrar cuentas de este navegador</h3>
    <p className="mt-2 text-sm text-white/75">Elige las cuentas que quieres trasladar a Supabase. Se conservan el ID, el rol y el avance de las encuestas. Las cuentas nuevas reciben una contraseña inicial.</p>
    {preview.error && <p role="alert" className="mt-3 text-sm text-red-200">{preview.error}</p>}
    {!preview.error && !preview.accounts.length && !canTransferWorkspace && <p className="mt-3 text-sm">Abre esta página en el navegador y la dirección donde se dieron de alta las cuentas locales.</p>}
    {preview.accounts.length > 0 && <ul className="my-4 max-h-56 space-y-2 overflow-y-auto">
      {preview.accounts.map(account => <li key={account.id}>
        <label className="flex items-start gap-2 rounded-lg bg-white/5 p-2.5 text-sm">
          <input type="checkbox" className="mt-1" checked={selected.has(account.id)} disabled={!account.eligible || busy} onChange={event => {
            const next = new Set(selected);
            if (event.target.checked) next.add(account.id);
            else next.delete(account.id);
            setSelected(next);
          }} />
          <span>{account.name} · {account.employeeNumber || 'Sin ID'} · {roleNames[account.role]}{!account.isActive && ' · Suspendida'}
            {!account.eligible && <small className="block text-amber-200">El ID falta, es inválido o está repetido.</small>}
          </span>
        </label>
      </li>)}
    </ul>}
    {canTransferWorkspace && <label className="my-4 flex items-center gap-2 text-sm">
      <input type="checkbox" checked={includeWorkspace} disabled={busy} onChange={event => setIncludeWorkspace(event.target.checked)} />
      Trasladar cursos, tareas y registros de Expertos de este navegador
    </label>}
    {failures.length > 0 && <ul role="alert" className="my-3 space-y-1 rounded-lg bg-red-950/70 p-3 text-sm text-red-100">
      {failures.map(message => <li key={message}>{message}</li>)}
    </ul>}
    {done && <p role="status" className="my-3 text-sm text-emerald-200">{passwords.length} cuentas nuevas. {passwords.length > 0 && 'Descarga las contraseñas iniciales antes de cerrar.'}</p>}
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      {passwords.length > 0 && <button type="button" className="rounded-xl border border-white/25 px-3 py-2 text-sm" onClick={downloadPasswords}>Descargar contraseñas iniciales</button>}
      <button type="button" className="rounded-xl border border-white/25 px-3 py-2 text-sm" onClick={onClose} disabled={busy}>Cerrar</button>
      {(preview.accounts.length > 0 || canTransferWorkspace) && <button type="button" className="btn-cinepolis-gold rounded-xl px-3 py-2 text-sm font-bold" disabled={busy || (!selected.size && !includeWorkspace)} onClick={() => void migrate()}>
        {busy ? 'Migrando…' : 'Trasladar registros seleccionados'}
      </button>}
    </div>
  </dialog>;
}
