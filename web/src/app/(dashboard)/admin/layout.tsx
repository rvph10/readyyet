import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getMe } from "@/lib/me";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
import { AdminNav } from "./admin-nav";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin"))("title") };
}

// ADR 0119: the back office of ADR 0032, for the platform admin alone.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [me, cookieStore] = await Promise.all([getMe(), cookies()]);
  // Not found rather than refused, so nobody else learns there's a page here.
  if (!me.platformAdmin) {
    notFound();
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <AdminNav me={me} collapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}>
        {children}
      </AdminNav>
    </div>
  );
}
