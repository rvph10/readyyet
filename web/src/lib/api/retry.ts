const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const RETRY_DELAY_MS = 300;

// One more try for a read that met a dropped connection or a gateway error,
// as during a Railway deploy. A write is never repeated, it could then
// happen twice (ADR 0045). A GET has no body, so the same Request can be
// sent twice.
export async function fetchWithRetry(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return fetch(request);
  }
  try {
    const response = await fetch(request);
    if (!RETRYABLE_STATUSES.has(response.status)) {
      return response;
    }
    // Unread, the body would hold its connection until garbage collection.
    await response.body?.cancel();
  } catch (error) {
    if (request.signal.aborted) {
      throw error;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return fetch(request);
}
