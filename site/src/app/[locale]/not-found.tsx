import { getLocale, getTranslations } from "next-intl/server";
import { ChipButton } from "@/components/home/ChipButton";
import { Nav } from "@/components/home/Nav";
import "./not-found.css";

export default async function NotFound() {
  const [t, locale] = await Promise.all([getTranslations("notFound"), getLocale()]);

  return (
    <div className="not-found container container--padded">
      <Nav />
      <main id="main-content" className="not-found__body">
        <p className="not-found__code">404</p>
        <h1 className="not-found__title">{t("title")}</h1>
        <p className="not-found__lead">{t("lead")}</p>
        <ChipButton href={`/${locale}`}>{t("home")}</ChipButton>
      </main>
    </div>
  );
}
