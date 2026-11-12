// The terms bind whoever owns the Business now: after a transfer, the new
// Owner accepts too (ADR 0138).
export function acceptedByOwner(acceptances: { userId: string }[], ownerId: string) {
  return acceptances.some((acceptance) => acceptance.userId === ownerId);
}
