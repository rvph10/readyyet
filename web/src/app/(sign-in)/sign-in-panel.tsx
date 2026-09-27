import { getTranslations } from "next-intl/server";

export async function SignInPanel() {
  const t = await getTranslations("signIn.panel");

  return (
    // bg-ink stands in for the picture to come, which will need to keep the
    // white title readable in the same way.
    <aside className="relative hidden w-1/2 overflow-hidden rounded-3xl bg-ink text-surface lg:block">
      <div className="absolute inset-x-8 top-8 xl:inset-x-10 xl:top-19">
        <p className="mb-4 text-title-h3 font-bold text-balance xl:text-title-h1">{t("title")}</p>
        <p className="text-p-md xl:text-p-lg">{t("text")}</p>
      </div>
    </aside>
  );
}
