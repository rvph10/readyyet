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

// ADR 0109: the banner whole, at 3:1. Across the page that would be half the
// screen, so from a laptop up it sits beside the greeting.
export function BusinessHero({ business, title, subtitle, corner, children }: Props) {
  return (
    <section className="flex flex-col overflow-clip rounded-sheet border border-border bg-surface lg:flex-row">
      <div className="relative aspect-[3/1] w-full shrink-0 bg-pine lg:h-44 lg:w-auto">
        {business.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.bannerUrl} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        {corner && <div className="absolute top-3 right-3">{corner}</div>}
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-3 p-5 lg:px-7">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" size="lg" />
          <div className="min-w-0">
            <h1 className="text-title-h5 wrap-anywhere md:text-title-h4">{title}</h1>
            <p className="text-p-sm text-muted">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
