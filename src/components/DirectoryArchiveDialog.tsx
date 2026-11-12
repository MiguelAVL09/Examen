import { useEffect, useRef, useState } from 'react';
import { localAuthService } from '../services/authService';

export function DirectoryArchiveDialog({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [restore] = useState(() => localAuthService.hasDirectoryArchive());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="directory-archive-title" className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-white/20 bg-kahoot-purple-dark p-6 text-white backdrop:bg-black/80" onCancel={event => {
      event.preventDefault();
      if (!busy) onClose();
    }}>
      <h3 id="directory-archive-title" className="text-lg font-black">{restore ? 'Restaurar limpieza archivada' : 'Limpiar directorio y cuentas'}</h3>
      <p className="mt-2 text-sm text-white/80">
        {restore ? 'Vuelve a agregar las cuentas y los cinepolitos archivados en este navegador.' : 'Conserva tu cuenta de administrador y el cinepolito indicado. Las demás cuentas y registros del directorio pasan a un archivo que puedes restaurar en este navegador.'}
      </p>
      <form className="mt-4 space-y-4" onSubmit={async event => {
        event.preventDefault();
        const employeeId = String(new FormData(event.currentTarget).get('employeeId') ?? '').trim();
        setBusy(true);
        setError('');
        try {
          const result = restore ? await localAuthService.restoreDirectory() : await localAuthService.archiveDirectory(employeeId);
          onDone(restore
            ? 'Se restauraron las cuentas y los registros archivados.'
            : 'Limpieza completada. Cuentas archivadas: ' + result.accounts + '. Registros del directorio archivados: ' + result.people + '.');
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : 'No se pudo completar la operación.');
        } finally {
          setBusy(false);
        }
      }}>
        {!restore && <label className="block text-sm font-bold">ID del cinepolito que se conserva
          <input name="employeeId" required maxLength={30} className="mt-2 w-full rounded-xl border border-white/25 bg-black/35 px-3 py-2.5 text-white" />
        </label>}
        {error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-100">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-white/25 px-4 py-2 text-sm">Cancelar</button>
          <button disabled={busy} className="btn-cinepolis-gold rounded-xl px-4 py-2 text-sm font-bold">{restore ? 'Restaurar registros' : 'Archivar y limpiar'}</button>
        </div>
      </form>
    </dialog>
  );
}
