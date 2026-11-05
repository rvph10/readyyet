import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMe } from "@/lib/me";
import { LocationNav } from "./location-nav";

export async function generateMetadata({ params }: LayoutProps<"/locations/[locationId]">): Promise<Metadata> {
  const [{ locationId }, { memberships }] = await Promise.all([params, getMe()]);
  return { title: memberships.find(({ location }) => location.id === locationId)?.location.name };
}

// ADR 0077: the Location is in the URL, nothing remembers a "current" one, so
// two tabs can show two Locations and an email's link opens the right one.
export default async function LocationLayout({ children, params }: LayoutProps<"/locations/[locationId]">) {
  const [{ locationId }, me] = await Promise.all([params, getMe()]);
  const current = me.memberships.find(({ location }) => location.id === locationId);
  if (!current) {
    notFound();
  }
  return (
    <div className="min-h-dvh lg:flex lg:gap-5 lg:p-5">
      <LocationNav me={me} memberships={me.memberships} current={current} />
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 lg:p-0">{children}</main>
    </div>
  );
}
