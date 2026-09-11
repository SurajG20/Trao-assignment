const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  } & T;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.error?.code ?? "ERROR",
      data.error?.message ?? "Request failed",
    );
  }
  return data as T;
}

export const api = {
  me: () => request<{ user: { id: string; email: string } }>("/api/auth/me"),
  register: (email: string, password: string) =>
    request<{ user: { id: string; email: string } }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: { id: string; email: string } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  kits: () => request<{ kits: import("./types").KitRecord[] }>("/api/kits"),
  kit: (id: string) =>
    request<{ kit: import("./types").KitRecord }>(`/api/kits/${id}`),
  createKit: (body: { jd: string; company_url: string; days: number }) =>
    request<{ kit: import("./types").KitRecord }>("/api/kits", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchKit: (id: string, body: Record<string, unknown>) =>
    request<{ kit: import("./types").KitRecord }>(`/api/kits/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  regenerate: (id: string, section: string) =>
    request<{ kit: import("./types").KitRecord }>(`/api/kits/${id}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ section }),
    }),
  practice: (id: string, flashcardId: string, confidence: number) =>
    request<{
      practice: { id: string; covered: boolean; confidence: number | null }[];
      next: string[];
    }>(`/api/kits/${id}/practice`, {
      method: "POST",
      body: JSON.stringify({ flashcardId, confidence }),
    }),
};
