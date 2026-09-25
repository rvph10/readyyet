import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-2 px-4">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="text-zinc-600">{t("tagline")}</p>
    </main>
  );
}
