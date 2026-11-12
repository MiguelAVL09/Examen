export function employeeKey(value?: string) {
  return typeof value === 'string' ? value.trim().normalize('NFKC').toUpperCase() : '';
}

export function validEmployeeId(value: string) {
  return /^[\p{L}\p{N}][\p{L}\p{N}._/-]{0,29}$/u.test(value);
}

export async function sha256Hex(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function employeeEmail(number: string) {
  return (await sha256Hex(employeeKey(number))).slice(0, 48) + '@employee.cinepolis.invalid';
}
