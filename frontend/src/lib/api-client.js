const API_URL = import.meta.env.VITE_API_URL ?? "";

export const NETWORK_ERROR = {
  code: "NETWORK_ERROR",
  message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง",
};

export const UNEXPECTED_RESPONSE = {
  code: "UNEXPECTED_RESPONSE",
  message: "ระบบยังไม่พร้อมใช้งาน ลองใหม่ภายหลัง",
};

export function apiUrl(path) {
  return `${API_URL}${path}`;
}

export function apiOrigin() {
  if (!API_URL) return window.location.origin;
  try {
    return new URL(API_URL, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

function isApiErrorBody(value) {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const { error } = value;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

export async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      body:
        options.body !== undefined && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : options.body,
    });
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }

  const payload = await response.json().catch(() => null);
  if (response.ok) return { ok: true, data: payload };
  return { ok: false, status: response.status, error: isApiErrorBody(payload) ? payload.error : UNEXPECTED_RESPONSE };
}

export function getJson(path) {
  return requestJson(path, { method: "GET" });
}

export function postJson(path, body) {
  return requestJson(path, { method: "POST", body });
}

export function patchJson(path, body) {
  return requestJson(path, { method: "PATCH", body });
}

export function deleteJson(path) {
  return requestJson(path, { method: "DELETE" });
}
