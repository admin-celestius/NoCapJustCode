const API_BASE_URL = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '');

async function request(path, payload, timeout = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(payload !== undefined && { body: JSON.stringify(payload) }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw Object.assign(new Error(data?.message || 'The Server Is Having a Skill Issue. Try again shortly.'), {
        status: response.status, code: data?.code, errors: data?.errors, conflicts: data?.conflicts,
      });
    }
    if (!data || typeof data !== 'object') throw new Error('The server returned an unexpected response. Please retry.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) {
      throw Object.assign(new Error('Looks like your internet went AFK. Check your connection and try again. Your details are still here.'), { code: 'NETWORK_ERROR' });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkHealth() {
  try {
    const data = await request('/health', undefined, 2000);
    return { healthy: data.ok === true };
  } catch {
    return { healthy: false };
  }
}

export async function checkTeamNameAvailability(teamName) {
  const trimmed = (teamName || '').trim();
  if (!trimmed || trimmed.length < 2) {
    return { available: false, message: 'Duo codename must be at least 2 characters' };
  }
  return request(`/api/registrations/check-team?name=${encodeURIComponent(trimmed)}`);
}

export const checkRegistrationConflicts = (payload) => request('/api/registrations/check', payload);
export const createOrder = (payload) => request('/api/registrations/create-order', payload);
export const verifyPayment = (payload) => request('/api/registrations/verify-payment', payload);

export async function verifyPass(regCode) {
  const code = (regCode || '').trim();
  if (!code) throw new Error('Registration code is required.');
  return request(`/api/registrations/${encodeURIComponent(code)}/verify`);
}

export async function verifyAdminPasskey(passcode) {
  const code = (passcode || '').trim();
  if (!code) throw new Error('6-digit security passkey is required.');
  return request('/api/registrations/admin/verify-passkey', { passcode: code });
}

export async function checkInAttendance(regCode, { round, passcode, markedBy }) {
  const code = (regCode || '').trim();
  if (!code) throw new Error('Registration code is required.');
  return request(`/api/registrations/${encodeURIComponent(code)}/checkin`, {
    round,
    passcode,
    markedBy,
  });
}
