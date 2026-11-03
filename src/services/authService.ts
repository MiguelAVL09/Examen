import type { UserAccount, UserRole, UserSession } from '../types/quiz';
import { generateUUID } from './quizService';

const USERS_STORAGE_KEY = 'cinepolis_users_secure_v1';
const SESSION_STORAGE_KEY = 'cinepolis_auth_session_v1';

// Hash seguro SHA-256 con Salt mediante Web Crypto API
async function hashText(text: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const normalized = text.trim().toLowerCase();
  const data = enc.encode(`${salt}:${normalized}:cinepolis_pepper_2026`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface RegisterDTO {
  email: string;
  name: string;
  nickname: string;
  employeeNumber?: string;
  branch: string;
  department: string;
  password: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

class AuthService {
  private usersCache: UserAccount[] = [];
  private initialized = false;

  private async initializeDefaults(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        this.usersCache = JSON.parse(stored);
      }
    } catch {
      this.usersCache = [];
    }

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

      // Cuenta de colaborador demostrativa para pruebas inmediatas
      const demoSalt = generateSalt();
      const demoPassHash = await hashText('Cinepolis123', demoSalt);
      const demoAnswerHash = await hashText('Diana', demoSalt);

      const demoUser: UserAccount = {
        id: 'user-demo-cinepolis',
        email: 'colaborador@cinepolis.com',
        nickname: 'Cinepolito Diana',
        name: 'Carlos Mendoza',
        employeeNumber: 'COL-1042',
        role: 'user',
        branch: 'Cinépolis Diana',
        department: 'Dulcería',
        passwordHash: demoPassHash,
        salt: demoSalt,
        securityQuestion: '¿Cuál es tu sucursal favorita?',
        securityAnswerHash: demoAnswerHash,
        createdAt: '2026-01-15T00:00:00.000Z',
        isActive: true,
      };

      this.usersCache.push(defaultAdmin, demoUser);
      this.saveUsersToStorage();
    }

    this.initialized = true;
  }

  private saveUsersToStorage(): void {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.usersCache));
    } catch (err) {
      console.warn('Error al guardar usuarios en almacenamiento seguro:', err);
    }
  }

  async login(identifier: string, password: string): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    await this.initializeDefaults();
    const cleanId = identifier.trim().toLowerCase();

    const user = this.usersCache.find(
      u =>
        u.email.toLowerCase() === cleanId ||
        u.nickname.toLowerCase() === cleanId ||
        (u.employeeNumber && u.employeeNumber.toLowerCase() === cleanId)
    );

    if (!user) {
      return { success: false, error: 'Usuario o correo no encontrado en el sistema.' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Esta cuenta ha sido desactivada por el administrador.' };
    }

    const calculatedHash = await hashText(password, user.salt);
    if (calculatedHash !== user.passwordHash) {
      return { success: false, error: 'Contraseña incorrecta. Verifica tus datos o usa la recuperación.' };
    }

    // Actualizar última sesión
    user.lastLogin = new Date().toISOString();
    this.saveUsersToStorage();

    // Guardar sesión en sessionStorage
    const session: UserSession = {
      user: { ...user },
      token: `sess_${generateUUID()}_${Date.now()}`,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000, // 12 horas
    };

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      // Si es admin, también habilitar el acceso al panel
      if (user.role === 'admin') {
        sessionStorage.setItem('kahoot_admin_auth', 'true');
      }
    } catch {}

    return { success: true, user };
  }

  async register(data: RegisterDTO): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    await this.initializeDefaults();

    if (!data.email.trim() || !data.email.includes('@')) {
      return { success: false, error: 'Por favor ingresa un correo electrónico válido.' };
    }
    if (!data.nickname.trim()) {
      return { success: false, error: 'Por favor ingresa un nombre o alias para el juego.' };
    }
    if (!data.password || data.password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres por seguridad.' };
    }

    const emailTaken = this.usersCache.some(u => u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (emailTaken) {
      return { success: false, error: 'Este correo electrónico ya está registrado.' };
    }

    const salt = generateSalt();
    const passwordHash = await hashText(data.password, salt);
    let securityAnswerHash: string | undefined = undefined;

    if (data.securityAnswer && data.securityAnswer.trim()) {
      securityAnswerHash = await hashText(data.securityAnswer, salt);
    }

    const newUser: UserAccount = {
      id: generateUUID(),
      email: data.email.trim().toLowerCase(),
      nickname: data.nickname.trim(),
      name: data.name.trim() || data.nickname.trim(),
      employeeNumber: data.employeeNumber ? data.employeeNumber.trim() : undefined,
      role: 'user',
      branch: data.branch || 'Cinépolis Tradicional',
      department: data.department || 'Operaciones',
      passwordHash,
      salt,
      securityQuestion: data.securityQuestion || '¿Cuál es tu sucursal de Cinépolis?',
      securityAnswerHash,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: true,
    };

    this.usersCache.push(newUser);
    this.saveUsersToStorage();

    // Iniciar sesión automáticamente
    const session: UserSession = {
      user: { ...newUser },
      token: `sess_${generateUUID()}_${Date.now()}`,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {}

    return { success: true, user: newUser };
  }

  getCurrentUser(): UserAccount | null {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;
      const session: UserSession = JSON.parse(stored);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        sessionStorage.removeItem('kahoot_admin_auth');
        return null;
      }
      return session.user;
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
    await this.initializeDefaults();
    const cleanId = identifier.trim().toLowerCase();
    const user = this.usersCache.find(
      u =>
        u.email.toLowerCase() === cleanId ||
        u.nickname.toLowerCase() === cleanId ||
        (u.employeeNumber && u.employeeNumber.toLowerCase() === cleanId)
    );

    if (!user) {
      return { success: false, error: 'Usuario no encontrado en la base de datos.' };
    }

    if (!user.securityQuestion) {
      return { success: false, error: 'El usuario no tiene configurada una pregunta de seguridad.' };
    }

    return { success: true, question: user.securityQuestion };
  }

  async recoverPasswordWithQuestion(
    identifier: string,
    answer: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    await this.initializeDefaults();
    const cleanId = identifier.trim().toLowerCase();
    const user = this.usersCache.find(
      u =>
        u.email.toLowerCase() === cleanId ||
        u.nickname.toLowerCase() === cleanId ||
        (u.employeeNumber && u.employeeNumber.toLowerCase() === cleanId)
    );

    if (!user) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    if (!user.securityAnswerHash) {
      return { success: false, error: 'No hay respuesta de seguridad registrada para esta cuenta.' };
    }

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
    user.passwordHash = await hashText(newPassword, newSalt);
    // Re-hashear también la respuesta con el nuevo salt
    user.securityAnswerHash = await hashText(answer, newSalt);

    this.saveUsersToStorage();
    return { success: true, message: '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.' };
  }

  // ============================================================================
  // ACCIONES ADMINISTRATIVAS SOBRE USUARIOS
  // ============================================================================
  async getUsers(): Promise<UserAccount[]> {
    await this.initializeDefaults();
    return [...this.usersCache];
  }

  async updateUser(userId: string, updates: Partial<UserAccount>): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    await this.initializeDefaults();
    const user = this.usersCache.find(u => u.id === userId);
    if (!user) return { success: false, error: 'Usuario no encontrado.' };

    // Evitar que el admin principal se degrade a sí mismo
    if (user.id === 'admin-cinepolis-master' && updates.role === 'user') {
      return { success: false, error: 'No se puede revocar el rol del Administrador Maestro.' };
    }

    Object.assign(user, updates);
    this.saveUsersToStorage();

    // Si es el usuario actual, actualizar la sesión
    const current = this.getCurrentUser();
    if (current && current.id === userId) {
      const session: UserSession = {
        user: { ...user },
        token: `sess_${generateUUID()}_${Date.now()}`,
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }

    return { success: true, user };
  }

  async resetUserPassword(userId: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    await this.initializeDefaults();
    const user = this.usersCache.find(u => u.id === userId);
    if (!user) return { success: false, error: 'Usuario no encontrado.' };

    const newSalt = generateSalt();
    user.salt = newSalt;
    user.passwordHash = await hashText(newPass, newSalt);
    this.saveUsersToStorage();
    return { success: true };
  }

  async toggleUserStatus(userId: string): Promise<{ success: boolean; isActive?: boolean }> {
    await this.initializeDefaults();
    const user = this.usersCache.find(u => u.id === userId);
    if (!user) return { success: false };
    if (user.id === 'admin-cinepolis-master') return { success: false };

    user.isActive = !user.isActive;
    this.saveUsersToStorage();
    return { success: true, isActive: user.isActive };
  }

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    await this.initializeDefaults();
    if (userId === 'admin-cinepolis-master') {
      return { success: false, error: 'No es posible eliminar al Administrador Maestro.' };
    }

    const idx = this.usersCache.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, error: 'Usuario no encontrado.' };

    this.usersCache.splice(idx, 1);
    this.saveUsersToStorage();
    return { success: true };
  }
}

export const authService = new AuthService();
