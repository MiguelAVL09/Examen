import { employeeKey, parseWorkspace, readWorkspace } from '../tracker';
import type { Workspace } from '../tracker';
import { getLegacyAccounts } from './authService';
import { supabase } from './supabaseClient';

const table = 'employee_training_workspace';
const transferKey = 'cinepolis-expertos.workspace-transfer.v1';

async function readSharedRecord() {
  const { data, error } = await supabase!.from(table).select('workspace,revision').eq('id', 1).single();
  if (error) throw error;
  return { workspace: parseWorkspace(data.workspace), revision: data.revision as string };
}

export async function readSharedWorkspace() {
  return (await readSharedRecord()).workspace;
}

export async function updateSharedWorkspace(transform: (workspace: Workspace) => Workspace) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { workspace, revision } = await readSharedRecord();
    const next = { ...transform(workspace), updatedAt: new Date().toISOString() };
    const { data, error } = await supabase!.from(table).update({ workspace: next, revision: crypto.randomUUID() })
      .eq('id', 1).eq('revision', revision).select('id').maybeSingle();
    if (error) throw error;
    if (data) return next;
  }
  throw new DOMException('Alguien más actualizó los registros. Vuelve a intentarlo.', 'ValidationError');
}

export function hasLocalWorkspaceToTransfer() {
  try {
    const source = readWorkspace();
    return Boolean(source.people.length || source.courses.length || source.tasks.length) &&
      localStorage.getItem(transferKey) !== (source.updatedAt ?? 'initial');
  } catch {
    return false;
  }
}

export async function transferLocalWorkspace() {
  const source = readWorkspace();
  const legacy = new Map(getLegacyAccounts().map(account => [account.id, account.employeeNumber]));
  const next = await updateSharedWorkspace(current => {
    const people = [...current.people];
    for (const original of source.people) {
      const person = original.accountId && legacy.has(original.accountId)
        ? { ...original, accountId: undefined, number: legacy.get(original.accountId) || original.number }
        : original;
      const number = employeeKey(person.number);
      const index = people.findIndex(other => other.id === person.id ||
        (person.accountId && other.accountId === person.accountId) || (number && employeeKey(other.number) === number));
      if (index < 0) people.push(person);
      else people[index] = { ...people[index], progress: { ...person.progress, ...people[index].progress } };
    }
    return {
      ...current, people,
      courses: [...current.courses, ...source.courses.filter(course => !current.courses.some(other => other.id === course.id))],
      tasks: [...current.tasks, ...source.tasks.filter(task => !current.tasks.some(other => other.id === task.id))],
    };
  });
  localStorage.setItem(transferKey, source.updatedAt ?? 'initial');
  return next;
}
