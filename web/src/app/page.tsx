import Image, { type StaticImageData } from "next/image";
import { getTranslations } from "next-intl/server";
import logo from "./icon.svg";

// Next.js types *.svg imports as any, in case an SVGR plugin turns them
// into components. Without one they are plain static images.
const logoImage = logo as StaticImageData;

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-2 px-4">
      <div className="flex items-center gap-3">
        {/* Decorative, the heading next to it already says the name. */}
        <Image src={logoImage} alt="" className="size-10" />
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
      </div>
      <p className="text-muted">{t("tagline")}</p>
    </main>
  );
}
