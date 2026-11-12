const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const RETRY_DELAY_MS = 300;
const ANSWER_TIMEOUT_MS = 15_000;

class ApiTimeoutError extends Error {}

// Bounds the wait for the API's answer, so a stalled API can't hold a render.
// Not the reading of its body, which an export streams for as long as it takes.
async function answerInTime(request: Request, init?: RequestInit): Promise<Response> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), ANSWER_TIMEOUT_MS);
  try {
    return await fetch(request, { ...init, signal: AbortSignal.any([request.signal, timeout.signal]) });
  } catch (error) {
    throw timeout.signal.aborted ? new ApiTimeoutError(`No answer from the API in ${ANSWER_TIMEOUT_MS} ms`) : error;
  } finally {
    clearTimeout(timer);
  }
}

// One more try for a read that met a dropped connection or a gateway error,
// as during a Railway deploy. A write is never repeated, it could then
// happen twice (ADR 0045). A GET has no body, so the same Request can be
// sent twice. One that got no answer in time isn't, the second try would only
// double the wait.
//
// keepalive takes both tries out of Next.js's dedupe of a render's reads, which
// would answer the retry with the first response instead of sending it, and
// keep that response for any later read of the same URL. A signal doesn't: its
// fetch folds the signal into a new Request before the dedupe looks for one.
export async function fetchWithRetry(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return answerInTime(request);
  }
  const send = () => answerInTime(request, { keepalive: true });
  try {
    const response = await send();
    if (!RETRYABLE_STATUSES.has(response.status)) {
      return response;
    }
    // Unread, the body would hold its connection until garbage collection.
    response.body?.cancel().catch(() => undefined);
  } catch (error) {
    if (request.signal.aborted || error instanceof ApiTimeoutError) {
      throw error;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return send();
}
