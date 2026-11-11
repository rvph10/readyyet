import { getTranslations } from "next-intl/server";
import { noOrphan } from "@/lib/typography";
import "@/temlis/ledger-782/styles.css";
import "./features.css";

// Ledger's "Scroll-Stacked Feature Cards" (Temlis), markup as bought: the
// data-astro-cid attribute is what its styles select on. Its scripts are
// /temlis/ledger-782/animations.js (heading) and script.js (the stack).
const CARDS = [
  { key: "tracking", icon: "qrcode", variant: "payments", pull: true },
  { key: "emails", icon: "notification", variant: "teams", pull: true },
  { key: "workflow", icon: "layers", variant: "cards", pull: false },
] as const;

export async function Features() {
  const t = await getTranslations("home.features");

  return (
    <div data-tmls="tmfp_kefyc3jobn5hr42g" data-temlis="ledger-782">
      <section className="features" id="features" data-astro-cid-cognygiv="">
        <div className="features__inner container container--padded" data-astro-cid-cognygiv="">
          <p className="section-label features__label" data-astro-cid-cognygiv="">
            {t("label")}
          </p>
          <h2 className="t-display features__heading" data-astro-cid-cognygiv="">
            {t("headingStart")}
            <br data-astro-cid-cognygiv="" />
            {t("headingEnd")}
          </h2>
          <div className="features__stack" data-astro-cid-cognygiv="">
            {CARDS.map(({ key, icon, variant, pull }) => (
              <div
                key={key}
                className={`features__slot${pull ? " features__slot--pull" : ""}`}
                data-astro-cid-cognygiv=""
              >
                <article className={`fcard fcard--${variant}`} data-astro-cid-cognygiv="">
                  <span className="fcard__badge" aria-hidden="true" data-astro-cid-cognygiv="">
                    <img src={`/home/feature-${icon}.svg`} alt="" width="20" height="20" data-astro-cid-cognygiv="" />
                  </span>
                  <h3 className="t-heading-md fcard__title" data-astro-cid-cognygiv="">
                    {t(`${key}.title`)}
                  </h3>
                  <p className="body-text fcard__body" data-astro-cid-cognygiv="">
                    {noOrphan(t(`${key}.text`))}
                  </p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
