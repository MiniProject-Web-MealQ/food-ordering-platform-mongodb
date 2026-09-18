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

/** POSTs JSON with cookie credentials. Data is `unknown`; callers must narrow it. */
export async function postJson(path, body) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }

  const payload = await response.json().catch(() => null);
  if (response.ok) return { ok: true, data: payload };
  return { ok: false, error: isApiErrorBody(payload) ? payload.error : UNEXPECTED_RESPONSE };
}
