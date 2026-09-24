// A Status as shown outside the dashboard: its code and labels, no ids.
export const publicStatusSelect = {
  select: { code: true, translations: { select: { locale: true, label: true } } },
} as const;

// A Status as shown in the dashboard, where a status change is sent by id.
export const statusSelect = {
  select: { id: true, code: true, translations: { select: { locale: true, label: true } } },
} as const;
