import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";

interface Props {
  business: { id: string; name: string; logoUrl: string | null; bannerUrl: string | null };
  title: string;
  subtitle: string;
  // Over the band, top right, for what changes the picture.
  corner?: ReactNode;
  children?: ReactNode;
}

// ADR 0109: the Business's banner with its logo on the edge, as a profile opens
// on most apps. Without a banner, the pine band still carries the logo.
export function BusinessHero({ business, title, subtitle, corner, children }: Props) {
  return (
    <section className="overflow-clip rounded-sheet border border-border bg-surface">
      <div className="relative h-24 bg-pine md:h-32">
        {business.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.bannerUrl} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        {corner && <div className="absolute top-3 right-3">{corner}</div>}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-5 pb-5 lg:px-7">
        <div className="flex min-w-0 items-end gap-4">
          <Avatar
            id={business.id}
            name={business.name}
            src={business.logoUrl}
            shape="square"
            size="xl"
            className="relative -mt-8 shrink-0 ring-4 ring-surface"
          />
          <div className="min-w-0 pt-3">
            <h1 className="text-title-h5 wrap-anywhere md:text-title-h4">{title}</h1>
            <p className="text-p-sm text-muted">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
