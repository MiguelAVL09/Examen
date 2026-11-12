import type { UserAccount, UserRole, UserSession } from '../types/quiz';
import { generateUUID } from './quizService';
import { readWorkspace, storageKey } from '../tracker';
import type { Cinepolito, Workspace } from '../tracker';

const USERS_STORAGE_KEY = 'cinepolis_users_secure_v1';
const SESSION_STORAGE_KEY = 'cinepolis_auth_session_v1';
const DIRECTORY_ARCHIVE_KEY = 'cinepolis-directory.archive.v1';

interface DirectoryArchive {
  accounts: UserAccount[];
  people: Cinepolito[];
}

// Hash seguro SHA-256 con Salt mediante Web Crypto API
async function hashText(text: string, salt: string, preserveCase = false): Promise<string> {
  const enc = new TextEncoder();
  const normalized = preserveCase ? text.trim() : text.trim().toLowerCase();
  const data = enc.encode(`${salt}:${normalized}:cinepolis_pepper_2026`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string) {
  return 'v2:' + await hashText(password, salt, true);
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface RegisterDTO {
  name: string;
  employeeNumber: string;
  department: string;
  password: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

type AccountResult = { success: boolean; user?: UserAccount; error?: string };

function employeeKey(value?: string) {
  return typeof value === 'string' ? value.trim().normalize('NFKC').toUpperCase() : '';
}

function validEmployeeId(value: string) {
  return /^[\p{L}\p{N}][\p{L}\p{N}._/-]{0,29}$/u.test(value);
}

class AuthService {
  private usersCache: UserAccount[] = [];
  private initialized = false;

  private async initializeDefaults(): Promise<void> {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    const accounts: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(accounts)) throw new Error('No se pudo leer el directorio de cuentas.');
    this.usersCache = accounts;
    if (this.initialized) return;

    // Verificar si existe la cuenta de Administrador por defecto
    const hasAdmin = this.usersCache.some(u => u.role === 'admin' || u.email === 'admin@cinepolis.com');
    if (!hasAdmin) {
      const adminSalt = generateSalt();
      const adminPassHash = await hashText('Mike040903', adminSalt);
      const adminAnswerHash = await hashText('Cinepolis2026', adminSalt);

      const defaultAdmin: UserAccount = {
        id: 'admin-cinepolis-master',
        email: 'admin@cinepolis.com',
        nickname: 'Admin Cinépolis',
        name: 'Administrador General',
        employeeNumber: 'CIN-MASTER',
        role: 'admin',
        branch: 'Corporativo Cinépolis',
        department: 'Operaciones',
        passwordHash: adminPassHash,
        salt: adminSalt,
        securityQuestion: '¿Código maestro de activación corporativa?',
        securityAnswerHash: adminAnswerHash,
        createdAt: '2026-01-01T00:00:00.000Z',
        isActive: true,
      };

      this.usersCache.push(defaultAdmin);
      this.saveUsersToStorage();
    }

    this.initialized = true;
  }

  private async withAccounts<T>(work: () => T | Promise<T>): Promise<T> {
    const run = async () => {
      await this.initializeDefaults();
      return work();
    };
    return navigator.locks ? await navigator.locks.request(USERS_STORAGE_KEY, run) : run();
  }

  private saveUsersToStorage(): boolean {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.usersCache));
      return true;
    } catch (err) {
      console.warn('Error al guardar usuarios en almacenamiento seguro:', err);
      return false;
    }
  }

  private saveSession(user: UserAccount) {
    const session: UserSession = {
      user: { ...user },
      token: `sess_${generateUUID()}_${Date.now()}`,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    if (user.role === 'admin') sessionStorage.setItem('kahoot_admin_auth', 'true');
    else sessionStorage.removeItem('kahoot_admin_auth');
  }

  private findByEmployeeId(employeeNumber: string) {
    const key = employeeKey(employeeNumber);
    const matches = key ? this.usersCache.filter(user => employeeKey(user.employeeNumber) === key) : [];
    if (matches.length === 1) return { user: matches[0] };
    return { error: matches.length > 1 ? 'Este ID está repetido en cuentas anteriores. Pide al administrador que lo revise.' : 'No encontramos una cuenta con ese ID de empleado.' };
  }

  private employeeIdTaken(employeeNumber: string, excludedId?: string) {
    const key = employeeKey(employeeNumber);
    return this.usersCache.some(account => account.id !== excludedId && employeeKey(account.employeeNumber) === key);
  }

  async login(identifier: string, password: string): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    return this.withAccounts(async () => {
      const { user: candidate, error } = this.findByEmployeeId(identifier);
      if (!candidate) return { success: false, error };

      if (!candidate.isActive) {
        return { success: false, error: 'Esta cuenta ha sido desactivada por el administrador.' };
      }

      const calculatedHash = candidate.passwordHash.startsWith('v2:')
        ? await hashPassword(password, candidate.salt)
        : await hashText(password, candidate.salt);
      await this.initializeDefaults();
      const user = this.usersCache.find(account => account.id === candidate.id && employeeKey(account.employeeNumber) === employeeKey(identifier));
      if (!user?.isActive) {
        return { success: false, error: 'Esta cuenta ya no está activa.' };
      }
      if (calculatedHash !== user.passwordHash) {
        return { success: false, error: 'Contraseña incorrecta. Verifica tus datos o usa la recuperación.' };
      }

      // Actualizar última sesión
      user.lastLogin = new Date().toISOString();
      this.saveUsersToStorage();

      try {
        this.saveSession(user);
      } catch {
        return { success: false, error: 'El navegador no pudo guardar la sesión.' };
      }

      return { success: true, user };
    });
  }

  async register(data: RegisterDTO): Promise<AccountResult> {
    const result = await this.createAccount(data, 'user', false);
    if (result.user) {
      try {
        this.saveSession(result.user);
      } catch {
        return { success: false, error: 'La cuenta se creó. Inicia sesión para continuar.' };
      }
    }
    return result;
  }

  async createUserByAdmin(data: RegisterDTO, role: UserRole): Promise<AccountResult> {
    return this.createAccount(data, role, true);
  }

  private async createAccount(data: RegisterDTO, role: UserRole, byAdmin: boolean): Promise<AccountResult> {
    if (byAdmin && !this.isAdmin()) return { success: false, error: 'Inicia sesión como administrador para crear cuentas.' };
    const employeeNumber = employeeKey(data.employeeNumber);
    if (!validEmployeeId(employeeNumber)) return { success: false, error: 'Ingresa un ID de empleado válido, de hasta 30 caracteres y sin espacios.' };
    if (!data.name.trim()) return { success: false, error: 'Ingresa el nombre completo.' };
    if (data.password.trim().length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres por seguridad.' };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(data.password, salt);
    let securityAnswerHash: string | undefined = undefined;

    if (data.securityAnswer && data.securityAnswer.trim()) {
      securityAnswerHash = await hashText(data.securityAnswer, salt);
    }

    const newUser: UserAccount = {
      id: generateUUID(),
      nickname: employeeNumber,
      name: data.name.trim(),
      employeeNumber,
      role,
      department: data.department.trim() || 'Operaciones',
      passwordHash,
      salt,
      securityQuestion: securityAnswerHash ? data.securityQuestion || '¿Cuál es tu película favorita?' : undefined,
      securityAnswerHash,
      createdAt: new Date().toISOString(),
      ...(byAdmin ? {} : { lastLogin: new Date().toISOString() }),
      isActive: true,
    };

    return this.withAccounts(() => {
      if (byAdmin && !this.isAdmin()) return { success: false, error: 'La sesión de administrador ya no está activa.' };
      if (this.employeeIdTaken(employeeNumber)) return { success: false, error: 'Ese ID de empleado ya está registrado.' };
      this.usersCache.push(newUser);
      if (!this.saveUsersToStorage()) return { success: false, error: 'El navegador no pudo guardar la cuenta.' };
      return { success: true, user: newUser };
    });
  }

  getCurrentUser(): UserAccount | null {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;
      const session: UserSession = JSON.parse(stored);
      const accounts: UserAccount[] = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) ?? '[]');
      const user = accounts.find(account => account.id === session.user.id);
      if (!user?.isActive || user.passwordHash !== session.user.passwordHash || (session.expiresAt && Date.now() >= session.expiresAt)) {
        this.logout();
        return null;
      }
      if (user.role !== 'admin') sessionStorage.removeItem('kahoot_admin_auth');
      return user;
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user !== null && user.role === 'admin' && user.isActive === true;
  }

  logout(): void {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem('kahoot_admin_auth');
    } catch {}
  }

  async getSecurityQuestion(identifier: string): Promise<{ success: boolean; question?: string; error?: string }> {
    return this.withAccounts(() => {
      const { user, error } = this.findByEmployeeId(identifier);
      if (!user) return { success: false, error };
      if (!user.isActive || !user.securityQuestion || !user.securityAnswerHash) {
        return { success: false, error: 'Pide a un administrador que restablezca tu contraseña.' };
      }
      return { success: true, question: user.securityQuestion };
    });
  }

  async recoverPasswordWithQuestion(
    identifier: string,
    answer: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.withAccounts(async () => {
      const { user, error } = this.findByEmployeeId(identifier);
      if (!user) return { success: false, error };
      if (!user.isActive || !user.securityAnswerHash) return { success: false, error: 'Pide a un administrador que restablezca tu contraseña.' };

      const calculatedAnswerHash = await hashText(answer, user.salt);
      if (calculatedAnswerHash !== user.securityAnswerHash) {
        return { success: false, error: 'La respuesta de seguridad es incorrecta. Inténtalo de nuevo.' };
      }

      if (!newPassword || newPassword.length < 6) {
        return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
      }

      // Asignar nuevo salt y hash de contraseña
      const newSalt = generateSalt();
      user.salt = newSalt;
      user.passwordHash = await hashPassword(newPassword, newSalt);
      // Re-hashear también la respuesta con el nuevo salt
      user.securityAnswerHash = await hashText(answer, newSalt);

      if (!this.saveUsersToStorage()) return { success: false, error: 'El navegador no pudo guardar la contraseña.' };
      return { success: true, message: '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.' };
    });
  }

  // ============================================================================
  // ACCIONES ADMINISTRATIVAS SOBRE USUARIOS
  // ============================================================================
  async getUsers(): Promise<UserAccount[]> {
    return this.withAccounts(() => [...this.usersCache]);
  }

  hasDirectoryArchive() {
    return localStorage.getItem(DIRECTORY_ARCHIVE_KEY) !== null;
  }

  async archiveDirectory(keepEmployeeId: string) {
    return this.changeDirectory(keepEmployeeId);
  }

  async restoreDirectory() {
    return this.changeDirectory(null);
  }

  private changeDirectory(keepEmployeeId: string | null) {
    return this.withAccounts(async () => {
      const run = () => {
        const admin = this.getCurrentUser();
        if (admin?.role !== 'admin') throw new Error('Inicia sesión como administrador.');
        const previousArchive = localStorage.getItem(DIRECTORY_ARCHIVE_KEY);
        const workspace = readWorkspace();
        const previousAccountCount = this.usersCache.length;
        let accounts: UserAccount[];
        let people: Cinepolito[];
        let archive: DirectoryArchive | null;

        if (keepEmployeeId !== null) {
          if (previousArchive) throw new Error('Ya hay una limpieza archivada en este navegador.');
          const { user, error } = this.findByEmployeeId(keepEmployeeId);
          if (!user) throw new Error(error);
          if (user.id === admin.id) throw new Error('Ingresa el ID del cinepolito que quieres conservar junto con tu cuenta.');
          accounts = [admin, user];
          const keep = new Set(accounts.map(account => employeeKey(account.employeeNumber)).filter(Boolean));
          people = workspace.people.filter(person => keep.has(employeeKey(person.number)));
          archive = {
            accounts: this.usersCache.filter(account => account.id !== admin.id && account.id !== user.id),
            people: workspace.people.filter(person => !keep.has(employeeKey(person.number))),
          };
          if (!archive.accounts.length && !archive.people.length) return { accounts: 0, people: 0 };
        } else {
          if (!previousArchive) throw new Error('No hay una limpieza archivada.');
          const saved: DirectoryArchive = JSON.parse(previousArchive);
          if (saved.accounts.some(account => this.usersCache.some(current => current.id === account.id ||
            (employeeKey(account.employeeNumber) && employeeKey(account.employeeNumber) === employeeKey(current.employeeNumber)))) ||
            saved.people.some(person => workspace.people.some(current => current.id === person.id ||
              (employeeKey(person.number) && employeeKey(person.number) === employeeKey(current.number))))) {
            throw new Error('Hay IDs que ya se volvieron a registrar. El archivo sigue guardado.');
          }
          accounts = [...this.usersCache, ...saved.accounts];
          people = [...workspace.people, ...saved.people];
          archive = null;
        }

        const nextWorkspace: Workspace = people.length === workspace.people.length ? workspace :
          { ...workspace, people, updatedAt: new Date().toISOString() };
        const oldWorkspace = localStorage.getItem(storageKey);
        const oldAccounts = localStorage.getItem(USERS_STORAGE_KEY);
        try {
          if (archive) localStorage.setItem(DIRECTORY_ARCHIVE_KEY, JSON.stringify(archive));
          if (nextWorkspace !== workspace) localStorage.setItem(storageKey, JSON.stringify(nextWorkspace));
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(accounts));
          if (!archive) localStorage.removeItem(DIRECTORY_ARCHIVE_KEY);
          this.usersCache = accounts;
        } catch {
          if (oldAccounts === null) localStorage.removeItem(USERS_STORAGE_KEY);
          else localStorage.setItem(USERS_STORAGE_KEY, oldAccounts);
          if (oldWorkspace === null) localStorage.removeItem(storageKey);
          else localStorage.setItem(storageKey, oldWorkspace);
          if (!previousArchive) localStorage.removeItem(DIRECTORY_ARCHIVE_KEY);
          throw new Error('El navegador no pudo completar la operación.');
        }
        return { accounts: Math.abs(accounts.length - previousAccountCount), people: Math.abs(people.length - workspace.people.length) };
      };
      return navigator.locks ? await navigator.locks.request(storageKey, run) : run();
    });
  }

  async updateUser(userId: string, updates: Partial<UserAccount>): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    return this.withAccounts(() => {
      const current = this.getCurrentUser();
      if (!current || (current.id !== userId && current.role !== 'admin')) {
        return { success: false, error: 'Tu cuenta no tiene permiso para editar este usuario.' };
      }
      const user = this.usersCache.find(u => u.id === userId);
      if (!user) return { success: false, error: 'Usuario no encontrado.' };

      // Evitar que el admin principal se degrade a sí mismo
      if (updates.role !== undefined && updates.role !== user.role) {
        if (!this.isAdmin()) return { success: false, error: 'Solo un administrador puede cambiar el rol.' };
        if (user.id === 'admin-cinepolis-master') {
          return { success: false, error: 'No se puede revocar el rol del Administrador Maestro.' };
        }
      }

      if (updates.employeeNumber !== undefined) {
        if (current.role !== 'admin') return { success: false, error: 'Solo un administrador puede cambiar el ID de empleado.' };
        const employeeNumber = employeeKey(updates.employeeNumber);
        if (!validEmployeeId(employeeNumber)) return { success: false, error: 'Ingresa un ID de empleado válido, de hasta 30 caracteres y sin espacios.' };
        if (this.employeeIdTaken(employeeNumber, userId)) return { success: false, error: 'Ese ID de empleado ya está registrado.' };
        updates = { ...updates, employeeNumber };
      }
      Object.assign(user, updates);
      if (!this.saveUsersToStorage()) return { success: false, error: 'El navegador no pudo guardar los cambios.' };
      if (current.id === userId) this.saveSession(user);

      return { success: true, user };
    });
  }

  async resetUserPassword(userId: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    return this.withAccounts(async () => {
      const actor = this.getCurrentUser();
      if (!actor || (actor.id !== userId && actor.role !== 'admin')) {
        return { success: false, error: 'Tu cuenta no tiene permiso para cambiar esta contraseña.' };
      }
      if (newPass.trim().length < 6) return { success: false, error: 'Usa al menos 6 caracteres en la contraseña.' };
      const user = this.usersCache.find(u => u.id === userId);
      if (!user) return { success: false, error: 'Usuario no encontrado.' };
      const passwordHash = await hashPassword(newPass, user.salt);
      await this.initializeDefaults();
      const current = this.getCurrentUser();
      if (!current || current.id !== actor.id || (current.id !== userId && current.role !== 'admin')) {
        return { success: false, error: 'Tu cuenta ya no tiene permiso para cambiar esta contraseña.' };
      }
      const latest = this.usersCache.find(account => account.id === userId);
      if (!latest || latest.salt !== user.salt || latest.passwordHash !== user.passwordHash) {
        return { success: false, error: 'La cuenta cambió durante la operación. Revisa sus datos e inténtalo de nuevo.' };
      }
      latest.passwordHash = passwordHash;
      if (!this.saveUsersToStorage()) return { success: false, error: 'El navegador no pudo guardar la contraseña.' };
      if (current.id === userId) this.saveSession(latest);
      return { success: true };
    });
  }

  async toggleUserStatus(userId: string): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
    return this.withAccounts(() => {
      if (!this.isAdmin()) return { success: false, error: 'Solo un administrador puede cambiar el estado de la cuenta.' };
      const user = this.usersCache.find(u => u.id === userId);
      if (!user) return { success: false, error: 'Usuario no encontrado.' };
      if (user.id === 'admin-cinepolis-master') return { success: false, error: 'El Administrador Maestro debe permanecer activo.' };

      user.isActive = !user.isActive;
      if (!this.saveUsersToStorage()) return { success: false, error: 'El navegador no pudo guardar el estado de la cuenta.' };
      return { success: true, isActive: user.isActive };
    });
  }

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    return this.withAccounts(() => {
      if (!this.isAdmin()) return { success: false, error: 'Solo un administrador puede eliminar cuentas.' };
      if (userId === 'admin-cinepolis-master') {
        return { success: false, error: 'No es posible eliminar al Administrador Maestro.' };
      }

      const idx = this.usersCache.findIndex(u => u.id === userId);
      if (idx === -1) return { success: false, error: 'Usuario no encontrado.' };

      this.usersCache.splice(idx, 1);
      if (!this.saveUsersToStorage()) return { success: false, error: 'El navegador no pudo eliminar la cuenta.' };
      return { success: true };
    });
  }
}

export const authService = new AuthService();
