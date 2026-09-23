// A Status as shown outside the dashboard: its code and labels, no ids.
export const publicStatusSelect = {
  select: { code: true, translations: { select: { locale: true, label: true } } },
} as const;
