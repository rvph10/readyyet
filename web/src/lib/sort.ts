export interface Sort<Column extends string> {
  column: Column;
  dir: "asc" | "desc";
}

// From the URL, so a sorted list survives a reload and can be shared.
export function parseSort<Column extends string>(
  search: { sort?: unknown; dir?: unknown },
  columns: readonly Column[],
): Sort<Column> | null {
  const column = columns.find((candidate) => candidate === search.sort);
  return column ? { column, dir: search.dir === "desc" ? "desc" : "asc" } : null;
}

export function setSort(params: URLSearchParams, sort: Sort<string> | null | undefined) {
  if (!sort) return;
  params.set("sort", sort.column);
  params.set("dir", sort.dir);
}
