export interface AdminUser {
  uid: string;
  email: string;
  displayName: string | null;
  role: "viewer" | "moderator" | "editor" | "operator" | "owner";
  permissions: string[];
}

interface AdminSessionResponse { data: { user: AdminUser } }
interface CsrfResponse { data: { csrfToken: string } }

export function useAdminUser() {
  return useState<AdminUser | null>("admin-user", () => null);
}

export function useAdminAccess(permission: string) {
  const user = useAdminUser();
  return computed(() => user.value?.permissions.includes(permission) === true);
}

export async function loadAdminSession() {
  const user = useAdminUser();
  const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
  const response = await $fetch<AdminSessionResponse>("/api/admin/auth/session", {
    credentials: "include",
    headers,
  });
  user.value = response.data.user;
  return user.value;
}

export async function adminRequest<T>(
  url: string,
  options: Parameters<typeof $fetch<T>>[1] = {},
) {
  const method = String(options?.method || "GET").toUpperCase();
  const headers = new Headers(options?.headers as HeadersInit | undefined);
  if (import.meta.server) {
    const forwarded = useRequestHeaders(["cookie"]);
    if (forwarded.cookie) headers.set("cookie", forwarded.cookie);
  }
  if (import.meta.server) {
    const requestHeaders = useRequestHeaders(["cookie", "host", "x-forwarded-host"]);
    for (const [name, value] of Object.entries(requestHeaders)) {
      if (value && !headers.has(name)) headers.set(name, value);
    }
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = await $fetch<CsrfResponse>("/api/admin/csrf", { credentials: "include" });
    headers.set("x-csrf-token", csrf.data.csrfToken);
  }
  return $fetch<T>(url, { ...options, credentials: "include", headers });
}

export function adminErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { statusMessage?: string; message?: string } }).data;
    return data?.statusMessage || data?.message || "La requête a échoué.";
  }
  return error instanceof Error ? error.message : "La requête a échoué.";
}
