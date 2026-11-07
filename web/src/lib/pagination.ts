// The API refuses a higher page, and the URL can be edited.
const MAX_PAGE = 100_000;

export function parsePage(value: unknown) {
  const page = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 1;
  return Math.min(Math.max(page, 1), MAX_PAGE);
}

export function lastPage(total: number, pageSize: number) {
  return Math.max(Math.ceil(total / pageSize), 1);
}

// The first and last pages and those around the current one. A gap that would
// hide a single page shows that page instead, which takes the same room.
export function pageNumbers(page: number, last: number): (number | "gap")[] {
  const shown = [...new Set([1, page - 1, page, page + 1, last])]
    .filter((number) => number >= 1 && number <= last)
    .sort((a, b) => a - b);
  return shown.flatMap((number, index) => {
    const missing = index === 0 ? 0 : number - shown[index - 1] - 1;
    if (missing === 0) return [number];
    return missing === 1 ? [number - 1, number] : (["gap", number] as const);
  });
}
