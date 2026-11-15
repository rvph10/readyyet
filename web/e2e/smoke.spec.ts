import { expect, test, type APIRequestContext } from "@playwright/test";

// ADR 0159: the main path a shop takes, from signing in to the Customer
// seeing their Ticket move. Emails land in e2e/email-sink.mjs.
const EMAIL_SINK = "http://localhost:3025";

interface SentEmail {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

async function emailsTo(request: APIRequestContext, address: string) {
  const response = await request.get(`${EMAIL_SINK}/emails`, { params: { to: address } });
  return (await response.json()) as SentEmail[];
}

test("an Owner signs up, creates a Ticket and moves it, and the Customer sees it", async ({
  page,
  request,
  browser,
}) => {
  // Each address gets 5 codes an hour, so every run signs up a new User.
  // Resend's test addresses, so an email that slipped past the sink would
  // never be delivered.
  const run = Date.now();
  const ownerEmail = `delivered+smoke-${run}@resend.dev`;
  const customerEmail = `delivered+smoke-customer-${run}@resend.dev`;
  const job = `Resole brown boots ${run}`;

  await test.step("sign in with the code sent by email", async () => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Email address" }).fill(ownerEmail);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

    let code = "";
    await expect
      .poll(async () => {
        const [email] = await emailsTo(request, ownerEmail);
        code = email?.text?.match(/\b\d{6}\b/)?.[0] ?? "";
        return code;
      })
      .toMatch(/^\d{6}$/);
    await page.getByRole("textbox", { name: "Code" }).pressSequentially(code);

    await expect(page.getByRole("heading", { name: "What's your name?" })).toBeVisible();
    await page.getByRole("textbox", { name: "Your name" }).fill("Smoke Test");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForURL("**/businesses/new");
  });

  await test.step("create a Business and its first Location", async () => {
    await page.getByRole("textbox", { name: "Business name" }).fill("Smoke Cobblers");
    await page.getByText("Shoe repair", { exact: true }).click();
    await expect(page.getByRole("radio", { name: "Shoe repair" })).toBeChecked();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await page.getByRole("textbox", { name: "Shop name" }).fill("Smoke Cobblers Ixelles");
    await page.getByRole("textbox", { name: "Phone number" }).fill("+32 470 12 34 56");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.waitForURL(/\/locations\/[^/]+$/);
    // The overview streams in after the URL changes, and a New Ticket panel
    // opened before it has landed loses what was typed in it.
    await expect(page.getByRole("heading", { name: "Get Smoke Cobblers Ixelles ready" })).toBeVisible();
  });

  await test.step("create a Ticket for a new Customer", async () => {
    await page.getByRole("banner").getByRole("button", { name: "New Ticket" }).click();
    const panel = page.getByRole("dialog", { name: "New Ticket" });
    await panel.getByRole("textbox", { name: "Customer name" }).fill("Camille Smoke");
    await panel.getByRole("textbox", { name: "Email" }).fill(customerEmail);
    await panel.getByRole("textbox", { name: "What's the job?" }).fill(job);
    await panel.getByRole("button", { name: "Create Ticket" }).click();

    await expect(panel.getByText("Show this to the Customer")).toBeVisible();
    await panel.getByRole("button", { name: "Open Ticket" }).click();
    await expect(page.getByRole("heading", { name: job })).toBeVisible();
  });

  let trackingCode = "";
  await test.step("move the Ticket to the next Status of its Workflow", async () => {
    await page.getByRole("button", { name: "Move to Repairing" }).click();
    await expect(page.getByRole("heading", { name: "Repairing", level: 2 })).toBeVisible();
    trackingCode = (await page.getByRole("textbox", { name: "Tracking code" }).inputValue()).replaceAll(" ", "");
    expect(trackingCode).not.toBe("");
  });

  await test.step("the Customer sees the new Status on the tracking page", async () => {
    // The Ticket's email carries the same link. A job sends it every 5 seconds.
    await expect
      .poll(async () => (await emailsTo(request, customerEmail))[0]?.html, { timeout: 15_000 })
      .toContain(`/t/${trackingCode}`);

    // Signed out, like the Customer.
    const customer = await browser.newContext({ baseURL: "http://localhost:3001", locale: "en-GB" });
    const tracking = await customer.newPage();
    await tracking.goto(`/t/${trackingCode}`);
    await expect(tracking.getByText(job)).toBeVisible();
    await expect(tracking.getByRole("heading", { name: "Repairing", level: 1 })).toBeVisible();
    await customer.close();
  });
});
