import { getTranslations } from "next-intl/server";
import { APP_URL } from "@/lib/app-url";
import "@/temlis/miros-681/styles.css";
import { ChipButton } from "../ChipButton";
import "./pricing.css";

const PLANS = [
  { key: "essentiel", variant: "is-two" },
  { key: "pro", variant: "is-three" },
] as const;

// Miros' "Intro Card With Two Pricing Plans" (Temlis), markup as bought,
// with Ledger's button in place of its own. Prices are the app's
// (plan-prices.ts in web, ADR 0031). Its script is
// /temlis/miros-681/animations.js.
export async function Pricing() {
  const t = await getTranslations("home.pricing");
  const signUp = `${APP_URL}/sign-in`;

  return (
    <div data-tmls="tmfp_dyylm7mpjcw7qp4n" data-temlis="miros-681">
      {/* reveal-ready sat on <html> in the template; its rules, scoped to the
          wrapper, only match it inside. */}
      <div className="page-wrapper reveal-ready">
        <section className="section_plans" id="pricing">
          <div className="padding-global padding-section-medium">
            <div className="container-large">
              <div className="content-wrapper is-plans-secondary">
                <div className="plans_header">
                  <h2 className="text-6xl" data-reveal="fade" data-reveal-words="true">
                    {t("title")}
                  </h2>
                </div>
                <div className="pricing_content" data-reveal-group="" data-reveal-step="120">
                  <div className="pricing_card is-secondary" data-reveal="">
                    <div className="pricing_card-top-content is-secondary">
                      <div className="pricing_card-header">
                        <img src="/home/logo.svg" loading="lazy" alt="" className="icon-1x1-large" />
                      </div>
                      <h3 className="text-3xl text-weight-semibold">
                        {t("intro.titleStart")} <em>{t("intro.titleEnd")}</em>
                      </h3>
                      <div className="text-base">{t("intro.text")}</div>
                    </div>
                    <div className="button-wrapper">
                      <a href={signUp} className="button-circle w-inline-block" aria-label={t("intro.start")}>
                        <svg viewBox="0 0 20 20" fill="none" className="icon-1x1-small" aria-hidden="true">
                          <path
                            d="M15.832 10L10.832 15M15.832 10L10.832 5M15.832 10L4.16536 10"
                            stroke="currentColor"
                            strokeWidth="1.66667"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                  {PLANS.map(({ key, variant }) => (
                    <div key={key} className={`pricing_card ${variant}`} data-reveal="">
                      <div className="pricing_card-top-content">
                        <div className="pricing_card-header">
                          <img src="/home/logo.svg" loading="lazy" alt="" className="icon-1x1-large" />
                          <div className="text-xl text-weight-medium">{t(`${key}.name`)}</div>
                        </div>
                        <div className="pricing_card-title">
                          <h3 className="text-5xl text-weight-semibold">
                            <em>{t(`${key}.price`)}</em>
                          </h3>
                          <div className="text-base text-color-secondary is-plans-v3">{t(`${key}.per`)}</div>
                        </div>
                        <div className="pricing_card-description">
                          <div className="text-base text-color-secondary is-plans-v3">{t(`${key}.includes`)}</div>
                        </div>
                        <div className="pricing_card-content-bottom">
                          <div className="text-xl text-weight-medium">{t("idealFor")}</div>
                          <div className="text-base text-color-secondary is-plans-v3">{t(`${key}.idealFor`)}</div>
                        </div>
                      </div>
                      <div className="button-wrapper is-first">
                        <ChipButton href={signUp}>{t("start")}</ChipButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
