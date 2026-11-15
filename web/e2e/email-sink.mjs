import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

// Stands in for Resend's API during the smoke test, so no email ever leaves
// (ADR 0137, ADR 0159). The API reaches it through RESEND_BASE_URL. The API
// only calls POST /emails; anything else is logged and refused, so a new
// call shows up here instead of passing unnoticed.
const port = Number(process.env.EMAIL_SINK_PORT ?? 3025);
const received = [];

function reply(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    if (request.method === "POST" && url.pathname === "/emails") {
      const email = JSON.parse(body);
      received.push(email);
      console.log(`[email-sink] ${[email.to].flat().join(", ")}: ${email.subject}`);
      return reply(response, 200, { id: randomUUID() });
    }
    if (request.method === "GET" && url.pathname === "/emails") {
      const to = url.searchParams.get("to");
      return reply(
        response,
        200,
        received.filter((email) => [email.to].flat().includes(to)),
      );
    }
    if (request.method === "GET" && url.pathname === "/") {
      return reply(response, 200, { ok: true });
    }
    console.log(`[email-sink] unexpected ${request.method} ${url.pathname}`);
    reply(response, 404, { name: "not_found", message: "Not handled by the e2e email sink" });
  });
}).listen(port, () => console.log(`[email-sink] listening on ${port}`));
