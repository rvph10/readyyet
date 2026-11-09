import Image, { type StaticImageData } from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import logo from "../icon.svg";

// Next.js types *.svg imports as any, in case an SVGR plugin turns them
// into components. Without one they are plain static images.
const logoImage = logo as StaticImageData;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-2 px-4">
      <div className="flex items-center gap-3">
        {/* Decorative, the heading next to it already says the name. */}
        <Image src={logoImage} alt="" className="size-10" />
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
      </div>
      <p className="text-muted">{t("tagline")}</p>
      <nav aria-label={t("languages")} className="flex gap-3 pt-4 text-sm">
        {routing.locales.map((other) => (
          <Link
            key={other}
            href="/"
            locale={other}
            aria-current={other === locale ? "page" : undefined}
            className="text-muted uppercase hover:text-ink aria-[current=page]:font-medium aria-[current=page]:text-ink"
          >
            {other}
          </Link>
        ))}
      </nav>
    </main>
  );
}
