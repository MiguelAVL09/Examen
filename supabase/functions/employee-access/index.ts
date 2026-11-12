import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { employeeEmail, employeeKey, sha256Hex, validEmployeeId } from '../_shared/employeeIdentity.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

type Role = 'user' | 'expert' | 'admin';
type Profile = {
  id: string; employee_number: string; name: string; department: string;
  role: Role; is_active: boolean; is_master: boolean; revision: string;
};

const profiles = 'employee_profiles';
const profileFields = 'id, employee_number, name, department, role, is_active, is_master, revision, created_at';
const server = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function string(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function validPassword(value: string) {
  return value.length >= 8 && new TextEncoder().encode(value).length <= 72;
}

async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await server.from(profiles).select(profileFields).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

async function saveNewEmployee(body: Record<string, unknown>, isMaster = false) {
  const employee_number = employeeKey(string(body.employeeNumber));
  const name = string(body.name);
  const department = string(body.department) || 'Operaciones';
  const password = string(body.password);
  const role = body.role;
  if (!validEmployeeId(employee_number) || !name || name.length > 100 || department.length > 60 ||
      !validPassword(password) || (role !== 'user' && role !== 'expert' && role !== 'admin')) {
    return respond({ error: 'Revisa el ID, los datos y la contraseña. Usa al menos 8 caracteres y hasta 72 bytes.' }, 400);
  }
  const { data: existing, error: lookupError } = await server.from(profiles).select('id').eq('employee_number', employee_number).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return respond({ error: 'Ese ID de empleado ya está registrado.' }, 409);
  const email = await employeeEmail(employee_number);
  const { data, error } = await server.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { cinepolis_employee: {
      employee_number, name, department, role, email_alias: email,
      is_active: body.isActive !== false, is_master: isMaster, revision: crypto.randomUUID(),
    } },
  });
  if (error || !data.user) {
    console.error('Employee provisioning failed', error?.code, error?.status);
    return respond({ error: 'No se pudo dar de alta la cuenta. Revisa los datos y si el ID ya existe.' }, 409);
  }
  return respond({ profile: await getProfile(data.user.id) }, 201);
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return respond({ error: 'Método no permitido.' }, 405);

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return respond({ error: 'Solicitud inválida.' }, 400);

    if (body.action === 'bootstrap') {
      const token = string(body.token);
      if (!/^[0-9a-f]{64}$/.test(token) || !validPassword(string(body.password))) {
        return respond({ error: 'Activación inválida.' }, 401);
      }
      const { data: claimed, error } = await server.from('employee_setup_tokens').delete()
        .eq('token_hash', await sha256Hex(token)).gt('expires_at', new Date().toISOString()).select('token_hash').maybeSingle();
      if (error) throw error;
      if (!claimed) return respond({ error: 'Activación inválida o ya utilizada.' }, 401);
      return await saveNewEmployee({ employeeNumber: 'CIN-MASTER', name: 'Administrador General', department: 'Operaciones',
        role: 'admin', password: body.password }, true);
    }

    const jwt = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!jwt) return respond({ error: 'Inicia sesión para continuar.' }, 401);
    const { data: { user }, error: authError } = await server.auth.getUser(jwt);
    if (authError || !user) return respond({ error: 'La sesión expiró. Vuelve a iniciar sesión.' }, 401);
    const actor = await getProfile(user.id);
    if (!actor?.is_active) return respond({ error: 'Tu cuenta está suspendida.' }, 403);
    const admin = actor.role === 'admin';

    if (body.action === 'create') {
      if (!admin) return respond({ error: 'Solo un administrador puede dar de alta cuentas.' }, 403);
      return await saveNewEmployee(body);
    }

    const id = string(body.id);
    const self = id === actor.id;
    if (!admin && (!self || body.action !== 'update')) return respond({ error: 'Tu cuenta no tiene permiso para esta acción.' }, 403);
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) return respond({ error: 'Cuenta inválida.' }, 400);
    const target = self ? actor : await getProfile(id);
    if (!target) return respond({ error: 'Cuenta no encontrada.' }, 404);

    if (body.action === 'delete') {
      if (self || target.is_master) return respond({ error: 'Esta cuenta no se puede eliminar.' }, 403);
      const { error } = await server.auth.admin.deleteUser(id);
      return error ? respond({ error: 'No se pudo eliminar la cuenta.' }, 409) : respond({ success: true });
    }

    if (body.action === 'reset-password') {
      const password = string(body.password);
      if (!validPassword(password)) return respond({ error: 'Usa de 8 caracteres a 72 bytes en la contraseña.' }, 400);
      const { error } = await server.auth.admin.updateUserById(id, { password });
      return error ? respond({ error: 'No se pudo guardar la contraseña. Prueba con una diferente.' }, 409) : respond({ success: true });
    }

    if (body.action !== 'update' && body.action !== 'toggle') return respond({ error: 'Acción inválida.' }, 400);
    const employee_number = admin && body.employeeNumber !== undefined ? employeeKey(string(body.employeeNumber)) : target.employee_number;
    const role = admin && body.role !== undefined ? body.role : target.role;
    const is_active = body.action === 'toggle' ? !target.is_active : target.is_active;
    const name = body.name === undefined ? target.name : string(body.name);
    const department = body.department === undefined ? target.department : string(body.department) || 'Operaciones';
    if (target.is_master && (employee_number !== target.employee_number || role !== 'admin' || !is_active)) {
      return respond({ error: 'La cuenta del Administrador Maestro está protegida.' }, 403);
    }
    if (!validEmployeeId(employee_number) || !name || name.length > 100 || department.length > 60 ||
        (role !== 'admin' && role !== 'expert' && role !== 'user')) return respond({ error: 'Revisa los datos de la cuenta.' }, 400);

    const email = await employeeEmail(employee_number);
    const { error } = await server.auth.admin.updateUserById(id, {
      ...(employee_number !== target.employee_number ? { email, email_confirm: true } : {}),
      app_metadata: { cinepolis_employee: { employee_number, name, department, role, is_active,
        is_master: target.is_master, email_alias: email, expected_revision: target.revision, revision: crypto.randomUUID() } },
    });
    return error ? respond({ error: 'No se pudo guardar. Comprueba si el ID ya existe y vuelve a intentarlo.' }, 409)
      : respond({ profile: await getProfile(id) });
  } catch (error) {
    console.error('Employee account operation failed', error instanceof Error ? error.name : 'database error');
    return respond({ error: 'El servicio de cuentas no está disponible. Vuelve a intentarlo.' }, 500);
  }
});
