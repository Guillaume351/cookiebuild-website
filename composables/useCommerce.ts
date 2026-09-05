import type { COSMETIC_CATALOG, CosmeticSlot } from "#shared/cosmetics-catalog";

export interface CommercePlayer { id: string; name: string | null }
interface CommerceSessionResponse { data: { player: CommercePlayer; expiresAt: string } }
interface CommerceCsrfResponse { data: { csrfToken: string } }

export function useCommercePlayer() {
  return useState<CommercePlayer | null>("commerce-player", () => null);
}

export async function loadCommerceSession() {
  const player = useCommercePlayer();
  const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
  try {
    const response = await $fetch<CommerceSessionResponse>("/api/commerce/session", { credentials: "include", headers });
    player.value = response.data.player;
    return response.data;
  } catch (error) {
    if (commerceUnauthorized(error)) player.value = null;
    throw error;
  }
}

export async function commerceRequest<T>(url: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  const method = String(options?.method || "GET").toUpperCase();
  const headers = new Headers(options?.headers as HeadersInit | undefined);
  if (import.meta.server) {
    const forwarded = useRequestHeaders(["cookie", "host", "x-forwarded-host"]);
    for (const [name, value] of Object.entries(forwarded)) {
      if (value && !headers.has(name)) headers.set(name, value);
    }
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = await $fetch<CommerceCsrfResponse>("/api/commerce/csrf", { credentials: "include" });
    headers.set("x-csrf-token", csrf.data.csrfToken);
  }
  return $fetch<T>(url, { ...options, credentials: "include", headers });
}

export function commerceErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { statusMessage?: string; message?: string } }).data;
    const message = data?.statusMessage || data?.message;
    if (message === "Invalid or expired commerce link code" || message === "Invalid link code") return "Ce code est invalide ou a expiré. Génère un nouveau code avec /support link.";
    if (message === "Invalid CSRF token") return "La vérification de sécurité a expiré. Actualise la page puis réessaie.";
    return message || "La requête a échoué.";
  }
  return error instanceof Error ? error.message : "La requête a échoué.";
}

export function commerceUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const failure = error as { statusCode?: number; status?: number; response?: { status?: number } };
  return (failure.statusCode ?? failure.status ?? failure.response?.status) === 401;
}

export function commerceReturnPath(value: unknown, fallback = "/cosmetics/history") {
  if (typeof value !== "string") return fallback;
  try {
    const url = new URL(value, "https://www.cookie-build.com");
    const routes = ["/cosmetics", "/cosmetics/checkout", "/cosmetics/history"];
    if (!value.startsWith("/") || url.origin !== "https://www.cookie-build.com" || !routes.includes(url.pathname)) return fallback;
    return `${url.pathname}${url.search}`;
  } catch { return fallback; }
}

export interface CommerceEntitlement {
  cosmeticId: string;
  grantedAt: string;
  expiresAt: string | null;
  item: (typeof COSMETIC_CATALOG)[number] | null;
}
export interface CommerceInventory {
  entitlements: CommerceEntitlement[];
  selections: Array<{ slot: CosmeticSlot; cosmeticId: string; selectedAt: string }>;
}
export interface CommerceOrder {
  id: string; productId: string; productName: string; access: string;
  amountTtcCents: number; currency: string; status: string;
  noticeVersion: string; noticeText: string; termsAcceptedAt: string; createdAt: string;
  immediatePerformanceConsentedAt: string | null; withdrawalWaiverAcknowledgedAt: string | null;
  withdrawalDeadline: string | null; withdrawalStatus: string;
}
export interface CommerceSubscription {
  orderId: string; productId: string; status: string; currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean; endedAt: string | null; updatedAt: string;
}
export interface CommerceHistory {
  orders: CommerceOrder[]; subscriptions: CommerceSubscription[];
  payments: Array<{ id: string; order_id: string; amount_cents: number; refunded_amount_cents: number; currency: string; status: string; paid_at: string | null; created_at: string }>;
  events: Array<{ id: string; order_id: string; kind: string; status: string; amount_cents: number | null; occurred_at: string }>;
}
export function commerceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    created: "Commande créée", checkout_open: "Paiement à finaliser", pending_webhook: "Confirmation du paiement en cours", dispute_lost: "Paiement contesté et annulé", pending: "En attente", pending_checkout: "Paiement à finaliser", checkout_created: "Paiement à finaliser", paid: "Payée",
    active: "Actif", trialing: "Période d’essai", past_due: "Paiement en retard", unpaid: "Impayé",
    incomplete: "Paiement à finaliser", incomplete_expired: "Paiement expiré", canceled: "Résilié", canceling: "Résiliation programmée",
    expired: "Expiré", failed: "Échec", refunded: "Remboursé", partially_refunded: "Remboursement partiel",
    refund_pending: "Remboursement en cours", withdrawal_pending: "Rétractation en cours", withdrawn: "Rétracté", disputed: "Paiement contesté", paused: "En pause", succeeded: "Confirmé",
  };
  return labels[status] ?? "Statut en cours de mise à jour";
}
export function commerceSubscriptionSummary(subscription: CommerceSubscription, now = Date.now()) {
  if (subscription.endedAt || ["canceled", "incomplete_expired"].includes(subscription.status)) return "Abonnement terminé. Aucun renouvellement prévu.";
  if (subscription.cancelAtPeriodEnd) return "Résiliation programmée. Aucun renouvellement à la fin de la période.";
  if (subscription.status !== "active" && subscription.status !== "trialing") return "Consulte le portail pour vérifier ton paiement et l’état de l’abonnement.";
  if (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd).getTime() <= now) return "Mise à jour de la prochaine période en attente de confirmation.";
  return "Renouvellement mensuel prévu. Tu peux résilier depuis le portail.";
}
