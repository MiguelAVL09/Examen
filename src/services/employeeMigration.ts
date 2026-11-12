import { getLegacyAccounts } from './authService';
import { cloudAuthService } from './cloudAuthService';
import { readSurveyCompletions, saveCloudCompletions } from './surveyCompletion';
import { employeeKey, readWorkspace, storageKey, validEmployeeId } from '../tracker';
import { UUID_REGEX } from './quizService';

export function getLocalAccountsForMigration() {
  const accounts = getLegacyAccounts().map(account => ({ ...account, employeeNumber: employeeKey(account.employeeNumber) }));
  const counts = new Map<string, number>();
  for (const account of accounts) counts.set(account.employeeNumber, (counts.get(account.employeeNumber) ?? 0) + 1);
  return accounts.filter(account => account.id !== 'admin-cinepolis-master').map(account => ({
    ...account, eligible: validEmployeeId(account.employeeNumber) && counts.get(account.employeeNumber) === 1,
  }));
}

export async function migrateLocalAccounts(selected: Set<string>) {
  const cloud = await cloudAuthService.getUsers();
  const byNumber = new Map(cloud.map(account => [employeeKey(account.employeeNumber), account]));
  const master = cloud.find(account => account.isMaster);
  const accountIds = new Map<string, string>(master ? [['admin-cinepolis-master', master.id]] : []);
  const passwords: { employeeNumber: string; password: string }[] = [];
  const failures: string[] = [];

  for (const account of getLocalAccountsForMigration()) {
    if (!account.eligible || !selected.has(account.id)) continue;
    const { employeeNumber } = account;
    const existing = byNumber.get(employeeNumber);
    if (existing) {
      if (existing.isMaster || existing.name.trim() !== account.name.trim()) {
        failures.push(`${employeeNumber} tiene un registro distinto en la nube. Revisa la cuenta en Usuarios & Accesos.`);
      } else {
        accountIds.set(account.id, existing.id);
      }
      continue;
    }
    try {
      const random = crypto.getRandomValues(new Uint8Array(18));
      const password = 'Cp8!' + [...random].map(byte => byte.toString(16).padStart(2, '0')).join('');
      const result = await cloudAuthService.createUserByAdmin({
        name: account.name, employeeNumber, department: account.department ?? '', password,
      }, account.role, account.isActive);
      if (!result.user) {
        failures.push(`${employeeNumber}. ${result.error || 'No se pudo crear la cuenta.'}`);
        continue;
      }
      passwords.push({ employeeNumber, password });
      accountIds.set(account.id, result.user.id);
    } catch {
      failures.push(`${employeeNumber}. No se pudo conectar con el servicio de cuentas.`);
    }
  }

  try {
    function linkWorkspace() {
      const workspace = readWorkspace();
      const people = workspace.people.map(person => {
        const accountId = person.accountId ? accountIds.get(person.accountId) : undefined;
        return accountId ? { ...person, accountId } : person;
      });
      if (people.some((person, index) => person !== workspace.people[index])) {
        localStorage.setItem(storageKey, JSON.stringify({ ...workspace, people }));
      }
    }
    if (navigator.locks) await navigator.locks.request(storageKey, linkWorkspace);
    else linkWorkspace();
    const rows = Object.entries(readSurveyCompletions()).flatMap(([quiz_id, ids]) => UUID_REGEX.test(quiz_id)
      ? [...new Set(ids.map(id => accountIds.get(id)).filter(Boolean))].map(account_id => ({ quiz_id, account_id: account_id! })) : []);
    for (let i = 0; i < rows.length; i += 200) await saveCloudCompletions(rows.slice(i, i + 200));
  } catch {
    failures.push('Quedó avance por trasladar. Vuelve a seleccionar las mismas cuentas y reintenta la migración.');
  }

  return { passwords, failures };
}
