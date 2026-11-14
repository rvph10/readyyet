// ADR 0150: staging is reachable by anyone and runs Stripe in test mode, so a
// stranger could use it as a free Pro shop, emailing real Customers from our
// domain. Set on staging only, a comma-separated list of addresses and
// "@domain" entries; unset, as in production, anyone can sign in.
export function isAllowedToSignIn(email: string, allowlist = process.env.SIGN_IN_ALLOWLIST): boolean {
  if (!allowlist) {
    return true;
  }
  const address = email.trim().toLowerCase();
  const domain = address.slice(address.lastIndexOf("@"));
  return allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .some((entry) => entry === address || entry === domain);
}
