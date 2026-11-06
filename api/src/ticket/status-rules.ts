import { STATUS_UNDO_WINDOW_MS } from "@readyyet/shared";

export { STATUS_UNDO_WINDOW_MS };

// A customer status email becomes due this long after the change: the
// undo window plus a margin, so an undo at the very end of its window
// can't race the send.
export const STATUS_NOTIFICATION_DELAY_MS = STATUS_UNDO_WINDOW_MS + 10_000;
