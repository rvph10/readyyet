// A referral link's code, kept by the proxy and sent when the User creates a
// Business (ADR 0047). The first link wins, for 60 days (ADR 0032).
export const REF_COOKIE = "ref";
export const REF_MAX_AGE_SECONDS = 60 * 24 * 60 * 60;
// The API refuses a longer referralCode, which would block creating the
// Business, where an unknown code is only ignored (ADR 0040).
export const REF_MAX_LENGTH = 64;
