// How long the latest status change can be undone (ADR 0016). Customer
// status emails wait exactly as long before sending (ADR 0015), so an
// undone change never reaches the customer.
export const STATUS_UNDO_WINDOW_MS = 2 * 60 * 1000;
