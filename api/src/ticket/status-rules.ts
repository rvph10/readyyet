// How long the latest status change can be undone (ADR 0016). Customer
// status emails wait exactly as long before sending (ADR 0015), so an
// undone change never reaches the customer.
export const STATUS_UNDO_WINDOW_MS = 2 * 60 * 1000;

// A customer status email becomes due this long after the change: the
// undo window plus a margin, so an undo at the very end of its window
// can't race the send.
export const STATUS_NOTIFICATION_DELAY_MS = STATUS_UNDO_WINDOW_MS + 10_000;
