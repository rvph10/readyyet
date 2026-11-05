import { Skeleton } from "@/components/ui/skeleton";
import { ShopCardSkeleton } from "../shop-card";

export default function Loading() {
  return (
    <ShopCardSkeleton>
      <Skeleton className="h-9 w-56 max-w-full" />
      <Skeleton className="mt-2 h-4 w-40" />
      <Skeleton className="my-5 h-11 w-56 max-w-full" />
      <Skeleton className="h-24 w-full rounded-xl!" />
    </ShopCardSkeleton>
  );
}
