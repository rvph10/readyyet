// A referral link's code travels in the URL from /sign-in to the Business it
// leads to, instead of a cookie that would need consent (ADR 0135).
// The API refuses a longer referralCode, which would block creating the
// Business, where an unknown code is only ignored (ADR 0040).
const REF_MAX_LENGTH = 64;

export function referralCode(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= REF_MAX_LENGTH ? value : undefined;
}

// Where a path goes with the referral code still on it.
export function withReferral(path: string, ref: string | undefined) {
  return ref ? `${path}?${new URLSearchParams({ ref })}` : path;
}
