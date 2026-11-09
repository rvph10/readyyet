const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const RETRY_DELAY_MS = 300;

// One more try for a read that met a dropped connection or a gateway error,
// as during a Railway deploy. A write is never repeated, it could then
// happen twice (ADR 0045). A GET has no body, so the same Request can be
// sent twice.
//
// keepalive takes both tries out of Next.js's dedupe of a render's reads, which
// would answer the retry with the first response instead of sending it, and
// keep that response for any later read of the same URL. A signal doesn't: its
// fetch folds the signal into a new Request before the dedupe looks for one.
export async function fetchWithRetry(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return fetch(request);
  }
  const send = () => fetch(request, { keepalive: true });
  try {
    const response = await send();
    if (!RETRYABLE_STATUSES.has(response.status)) {
      return response;
    }
    // Unread, the body would hold its connection until garbage collection.
    response.body?.cancel().catch(() => undefined);
  } catch (error) {
    if (request.signal.aborted) {
      throw error;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return send();
}
