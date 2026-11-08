import { Skeleton } from "@/components/ui/skeleton";
import { LocationCrumbs } from "./location-crumbs";

interface Props {
  // Null while a page named after its data, like a Customer's, loads (ADR 0119).
  title: string | null;
  subtitle?: string;
  // The last breadcrumb, on a page under a section.
  crumb?: string;
}

// Every page of a Location opens with this. Search and New Ticket are in the
// top bar (ADR 0103).
export function PageHeader({ title, subtitle, crumb }: Props) {
  return (
    <header className="flex min-w-0 flex-col gap-1">
      <LocationCrumbs current={crumb} />
      {title === null ? (
        <Skeleton className="my-1 h-8 w-72 max-w-full md:h-10" />
      ) : (
        <h1 title={title} className="text-title-h5 wrap-anywhere md:line-clamp-1 md:text-title-h4">
          {title}
        </h1>
      )}
      {subtitle && <p className="text-p-sm text-muted md:truncate">{subtitle}</p>}
    </header>
  );
}
