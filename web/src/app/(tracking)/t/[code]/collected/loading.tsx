import { Skeleton } from "@/components/ui/skeleton";
import { ShopCardSkeleton } from "../shop-card";

export default function Loading() {
  return (
    <ShopCardSkeleton>
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="mt-2 h-4 w-40" />
      <Skeleton className="mt-4 h-6 w-full" />
      <Skeleton className="mt-6 h-11 w-40 rounded-full!" />
    </ShopCardSkeleton>
  );
}
