import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tracking } from "./tracking";

function Frame({ below, children, busy }: { below?: ReactNode; children: ReactNode; busy?: boolean }) {
  return (
    <main aria-busy={busy} className="flex min-h-dvh flex-col items-center p-4 md:p-5">
      <div className="flex w-full flex-1 items-center justify-center">
        <Panel padding="lg" className="w-full max-w-lg md:p-8">
          {children}
        </Panel>
      </div>
      {below}
    </main>
  );
}

interface Props {
  location: Tracking["location"];
  // At the bottom of the screen, outside the card.
  below?: ReactNode;
  children: ReactNode;
}

// One thing to answer about a Ticket, in the Location's name, for the pages an
// email link leads to beside the tracking page.
export function LocationCard({ location, below, children }: Props) {
  return (
    <Frame below={below}>
      <header className="mb-6 flex items-center gap-3">
        <Avatar id={location.name} name={location.name} src={location.logoUrl} shape="square" />
        <p className="min-w-0 text-label-md text-balance wrap-anywhere">{location.name}</p>
      </header>
      {children}
    </Frame>
  );
}

// Its own, the tracking page's skeleton has a different shape.
export function LocationCardSkeleton({ children }: { children: ReactNode }) {
  const t = useTranslations("tracking");
  return (
    <Frame busy>
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-xl!" />
        <Skeleton className="h-5 w-40" />
      </div>
      {children}
    </Frame>
  );
}
