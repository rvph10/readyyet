import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "../src/lib/api/retry";

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

describe("fetchWithRetry", () => {
  it("returns a successful read without retrying", async () => {
    fetchMock.mockResolvedValueOnce(new Response("ok"));
    const response = await fetchWithRetry(new Request("http://api/tracking/abc"));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([502, 503, 504])("retries a read once on a %i", async (status) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status })).mockResolvedValueOnce(new Response("ok"));
    const response = await fetchWithRetry(new Request("http://api/tracking/abc"));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a read once on a network error", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(new Response("ok"));
    const response = await fetchWithRetry(new Request("http://api/tracking/abc"));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second try", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    const response = await fetchWithRetry(new Request("http://api/tracking/abc"));
    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([400, 404, 429, 500])("doesn't retry a %i", async (status) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status }));
    const response = await fetchWithRetry(new Request("http://api/tracking/abc"));
    expect(response.status).toBe(status);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("releases the failed response's body before retrying", async () => {
    const failed = new Response("bad gateway", { status: 502 });
    fetchMock.mockResolvedValueOnce(failed).mockResolvedValueOnce(new Response("ok"));
    await fetchWithRetry(new Request("http://api/tracking/abc"));
    expect(failed.bodyUsed || failed.body?.locked).toBe(true);
  });

  it("doesn't retry an aborted read", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    await expect(fetchWithRetry(new Request("http://api/tracking/abc", { signal: controller.signal }))).rejects.toThrow(
      "aborted",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never retries a write, even on a network error", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const request = new Request("http://api/tracking/abc/collected", { method: "POST" });
    await expect(fetchWithRetry(request)).rejects.toThrow("fetch failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't wait for a cancelled body, which never settles on Next.js's copy of a response", async () => {
    const never = new Response(null, { status: 503 });
    Object.defineProperty(never, "body", { value: { cancel: () => new Promise(() => undefined) } });
    fetchMock.mockResolvedValueOnce(never).mockResolvedValueOnce(new Response("ok"));

    const response = await fetchWithRetry(new Request("http://api.test/me"));

    expect(response.status).toBe(200);
  });

  it("sends the retry with a signal, which Next.js doesn't treat as a duplicate", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(new Response("ok"));
    const request = new Request("http://api.test/me");

    await fetchWithRetry(request);

    expect(fetchMock).toHaveBeenLastCalledWith(request, { signal: request.signal });
  });
});
