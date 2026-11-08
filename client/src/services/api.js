// client/src/services/api.js
import { mockRegister } from "./mockApi.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK === "true" || !API_BASE_URL;

/**
 * Non-blocking health check against the real backend /health endpoint.
 * If backend is unreachable or returns non-200, resolves cleanly with { healthy: false }.
 */
export async function checkHealth() {
  if (FORCE_MOCK || !API_BASE_URL) {
    return { healthy: false, usingMock: true };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { healthy: true, usingMock: false, data };
    }
    return { healthy: false, usingMock: true };
  } catch (error) {
    // Non-blocking: fail quietly to mock
    return { healthy: false, usingMock: true, error: error?.message };
  }
}

/**
 * Register participant(s) for LARPER OR CODER.
 * Transparently falls back to mock adapter if backend endpoint is unavailable.
 *
 * @param {Object} payload - Validated form registration payload
 * @returns {Promise<{ success: boolean, registration: Object, message: string }>}
 */
export async function registerParticipant(payload) {
  if (FORCE_MOCK) {
    return mockRegister(payload);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }

    if (response.status === 404) {
      // Endpoint not yet implemented on backend -> fall back to mock
      return await mockRegister(payload);
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Registration submission failed.");
  } catch (error) {
    if (error.name === "AbortError" || error.message.includes("Failed to fetch")) {
      // Backend is offline -> gracefully proceed with mock adapter
      return await mockRegister(payload);
    }
    throw error;
  }
}
