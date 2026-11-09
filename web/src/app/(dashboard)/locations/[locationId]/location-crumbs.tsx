"use client";

import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";
import { useLocationActions } from "./location-actions";
import { SECTIONS } from "./sections";

// From the shop down. Its Today page is the top, with nothing above it to show.
export function LocationCrumbs({ current }: { current?: string }) {
  const t = useTranslations("dashboard");
  const { locationId } = useParams<{ locationId: string }>();
  const { locationName } = useLocationActions();
  const pathname = usePathname();
  const home = `/locations/${locationId}`;
  const section = SECTIONS.find(({ slug }) => slug && pathname.startsWith(`${home}/${slug}`));
  // A page outside the sections, like the User's profile, hangs off the shop.
  if (!section)
    return current ? <Breadcrumbs crumbs={[{ label: locationName, href: home }, { label: current }]} /> : null;
  const crumbs: Crumb[] = [
    { label: locationName, href: home },
    { label: t(`sections.${section.key}`), href: current ? `${home}/${section.slug}` : undefined },
  ];
  if (current) crumbs.push({ label: current });
  return <Breadcrumbs crumbs={crumbs} />;
}
