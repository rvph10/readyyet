import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

// Only the page's side: the navigation stays while a section loads.
export default function Loading() {
  const t = useTranslations("dashboard");
  return (
    <div aria-busy className="flex flex-1 flex-col gap-5">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <Skeleton className="h-12 w-72 max-w-full" />
      <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <Skeleton key={tile} className="h-44 rounded-sheet" />
        ))}
        <Skeleton className="col-span-2 h-96 rounded-sheet" />
        <Skeleton className="col-span-2 h-96 rounded-sheet md:col-span-1" />
        <Skeleton className="col-span-2 h-96 rounded-sheet md:col-span-1" />
      </div>
    </div>
  );
}
