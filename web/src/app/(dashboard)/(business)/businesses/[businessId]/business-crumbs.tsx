"use client";

import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import { createContext, useContext } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const BusinessNameContext = createContext("");

const SECTIONS = ["team", "billing", "settings"] as const;

// From the Business down. Its home is the top, with nothing above it to show.
export function BusinessCrumbs({ title }: { title: string }) {
  const t = useTranslations("business");
  const name = useContext(BusinessNameContext);
  const { businessId } = useParams<{ businessId: string }>();
  const pathname = usePathname();
  const home = `/businesses/${businessId}`;
  if (pathname === home) return null;
  const section = SECTIONS.find((slug) => pathname === `${home}/${slug}`);
  return <Breadcrumbs crumbs={[{ label: name, href: home }, { label: section ? t(`nav.${section}`) : title }]} />;
}
