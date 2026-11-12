import type { UserAccount, UserRole } from '../types/quiz';
import { employeeEmail, employeeKey, validEmployeeId } from '../../supabase/functions/_shared/employeeIdentity';
import { supabase } from './supabaseClient';
import type { RegisterDTO } from './authService';

type Profile = {
  id: string; employee_number: string; name: string; department: string; role: UserRole;
  is_active: boolean; is_master: boolean; created_at: string;
};

const profileFields = 'id, employee_number, name, department, role, is_active, is_master, created_at';

function account(profile: Profile): UserAccount {
  return {
    id: profile.id, employeeNumber: profile.employee_number, nickname: profile.employee_number,
    name: profile.name, department: profile.department, role: profile.role, isActive: profile.is_active,
    isMaster: profile.is_master, createdAt: profile.created_at,
  };
}

async function readProfile(id: string) {
  const { data, error } = await supabase!.from('employee_profiles').select(profileFields).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? account(data as Profile) : null;
}

async function employeeAction(body: Record<string, unknown>) {
  const { data, error } = await supabase!.functions.invoke<{ profile?: Profile; success?: boolean }>('employee-access', { body });
  if (error) {
    const failure = error.context instanceof Response ? await error.context.json().catch(() => null) : null;
    return { success: false, error: failure?.error || 'No se pudo conectar con el servicio de cuentas.' };
  }
  return { success: true, user: data?.profile ? account(data.profile) : undefined };
}

class CloudAuthService {
  private currentUser: UserAccount | null = null;
  private directory: UserAccount[] = [];
  private sessionVersion = 0;

  getCurrentUser() { return this.currentUser; }
  isAdmin() { return this.currentUser?.role === 'admin' && this.currentUser.isActive; }

  async refreshCurrentUser() {
    const version = this.sessionVersion;
    const { data: { session }, error: sessionError } = await supabase!.auth.getSession();
    if (sessionError && sessionError.name !== 'AuthSessionMissingError') throw sessionError;
    const user = session ? await readProfile(session.user.id) : null;
    if (version !== this.sessionVersion) return this.currentUser;
    this.currentUser = user?.isActive ? user : null;
    if (!this.currentUser) this.directory = [];
    return this.currentUser;
  }

  async login(identifier: string, password: string) {
    const number = employeeKey(identifier);
    if (!validEmployeeId(number)) return { success: false, error: 'Ingresa un ID de empleado válido.' };
    this.sessionVersion++;
    const { data, error } = await supabase!.auth.signInWithPassword({ email: await employeeEmail(number), password: password.trim() });
    if (error || !data.user) {
      return { success: false, error: error?.status === 400 ? 'Verifica tu ID de empleado y tu contraseña.'
        : 'No se pudo iniciar sesión. Vuelve a intentarlo.' };
    }
    try {
      const user = await readProfile(data.user.id);
      if (!user?.isActive) {
        await this.logout();
        return { success: false, error: 'Tu cuenta está suspendida o pendiente de alta. Consulta a Administración.' };
      }
      this.currentUser = user;
      return { success: true, user };
    } catch {
      await this.logout();
      return { success: false, error: 'No se pudo cargar tu cuenta. Vuelve a intentarlo.' };
    }
  }

  async logout() {
    this.sessionVersion++;
    this.currentUser = null;
    this.directory = [];
    sessionStorage.removeItem('kahoot_admin_auth');
    await supabase!.auth.signOut({ scope: 'local' });
  }

  async getUsers() {
    const { data, error } = await supabase!.from('employee_profiles').select(profileFields).order('name');
    if (error) throw error;
    this.directory = (data as Profile[]).map(account);
    return this.directory;
  }

  getDirectoryAccounts() { return this.directory; }
  async loadDirectoryAccounts() { return this.getUsers(); }

  async createUserByAdmin(data: RegisterDTO, role: UserRole, isActive = true) {
    return employeeAction({ action: 'create', name: data.name, employeeNumber: data.employeeNumber,
      department: data.department, password: data.password, role, isActive });
  }

  async updateUser(id: string, updates: Partial<UserAccount>) {
    const result = await employeeAction({ action: 'update', id, name: updates.name, department: updates.department,
      employeeNumber: updates.employeeNumber, role: updates.role });
    if (result.user?.id === this.currentUser?.id) this.currentUser = result.user ?? this.currentUser;
    return result;
  }

  async resetUserPassword(id: string, password: string): Promise<{ success: boolean; error?: string }> {
    const trimmed = password.trim();
    if (trimmed.length < 8 || new TextEncoder().encode(trimmed).length > 72) {
      return { success: false, error: 'Usa al menos 8 caracteres y hasta 72 bytes en la contraseña.' };
    }
    if (id !== this.currentUser?.id) return employeeAction({ action: 'reset-password', id, password });
    const { error } = await supabase!.auth.updateUser({ password: trimmed });
    return error ? { success: false, error: 'Usa una contraseña nueva de al menos 8 caracteres o vuelve a iniciar sesión.' }
      : { success: true };
  }

  async toggleUserStatus(id: string) {
    const result = await employeeAction({ action: 'toggle', id });
    return { ...result, isActive: result.user?.isActive };
  }

  async deleteUser(id: string) { return employeeAction({ action: 'delete', id }); }
}

export const cloudAuthService = new CloudAuthService();
