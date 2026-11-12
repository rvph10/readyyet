import { getLocale, getTranslations } from "next-intl/server";
import { signInUrl } from "@/lib/sign-in-url";
import "@/temlis/nexio-641/styles.css";
import { FillButton } from "../FillButton";
import "./pricing.css";

// The app's prices (web plan-prices.ts, ADR 0031), without VAT (ADR 0107).
const PRICES = { essentiel: { month: 29, year: 290 }, pro: { month: 49, year: 490 } } as const;
const PLANS = [
  { key: "essentiel", icon: "/home/pricing-mdi_like.svg" },
  { key: "pro", icon: "/home/pricing-material-symbols_star-rounded.svg" },
] as const;
const PERIODS = [
  { key: "month", tab: "Tab 1" },
  { key: "year", tab: "Tab 2" },
] as const;
const ITEMS = [0, 1, 2, 3, 4];
const LOCALES: Record<string, string> = { fr: "fr-BE", nl: "nl-BE", en: "en-IE" };

// Nexio's "Monthly Yearly Pricing Switch" (Temlis), markup as bought, for two
// plans in Ledger's look (pricing.css), with Ledger's buttons in place of its
// own. Its switch turns the prices on reels, /temlis/nexio-641/script.js; it
// enters like every section, through data-entrance (lib/motion/reveal.ts).
// Its small images load at once: lazy, Chrome never loaded those in a panel the
// switch shows.
export async function Pricing() {
  const [t, signUp, locale] = await Promise.all([getTranslations("home.pricing"), signInUrl(), getLocale()]);
  const euros = (amount: number) =>
    new Intl.NumberFormat(LOCALES[locale], { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
      amount,
    );

  return (
    <div className="container container--bleed pricing-frame" id="pricing">
      <div data-tmls="tmfp_6ulmvpkrno4sleyj" data-temlis="nexio-641">
        <section className="section_hero">
          <div className="padding-global">
            <div className="container-large">
              <div className="hero_wrap">
                <div className="top" data-entrance-group="">
                  <div className="badge" data-entrance="">
                    <div className="light_line">
                      <img src="/home/pricing-arrow-left.svg" alt="" width="132" height="20" className="badge_right" />
                      <div className="light_gradient is-left"></div>
                    </div>
                    <div className="badge_element">
                      <div>{t("label")}</div>
                      <img src="/home/pricing-gradient.webp" alt="" className="badge_gradient" />
                    </div>
                    <div className="light_line">
                      <img src="/home/pricing-arrow-right.svg" alt="" width="132" height="20" className="badge_right" />
                      <div className="light_gradient"></div>
                    </div>
                  </div>
                  <div className="header">
                    <h2 className="heading-style-h1" data-entrance="title">
                      {t("title")}
                    </h2>
                    <div className="description" data-entrance="">
                      <div>{t("intro")}</div>
                    </div>
                  </div>
                </div>
                <div className="tabs w-tabs" data-tabs="" data-entrance="">
                  <div className="tabs_menu w-tab-menu" role="tablist" aria-label={t("billedEvery")}>
                    <span className="tabs_pill" data-tab-pill="" aria-hidden="true"></span>
                    {PERIODS.map(({ key, tab }, index) => (
                      <button
                        key={key}
                        type="button"
                        className={`tab w-inline-block w-tab-link ${index === 0 ? "w--current" : ""}`}
                        role="tab"
                        id={`pricing-tab-${key}`}
                        aria-controls={`pricing-panel-${key}`}
                        aria-selected={index === 0}
                        tabIndex={index === 0 ? undefined : -1}
                        data-tab={tab}
                      >
                        <div>
                          {t(key === "month" ? "monthly" : "yearly")}
                          {key === "year" && <span className="pricing-saving">{t("twoMonthsFree")}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="tabs_content w-tab-content">
                    {PERIODS.map(({ key: period, tab }, index) => (
                      <div
                        key={period}
                        className={`tabs_pane w-tab-pane ${index === 0 ? "w--tab-active" : ""}`}
                        role="tabpanel"
                        id={`pricing-panel-${period}`}
                        aria-labelledby={`pricing-tab-${period}`}
                        hidden={index !== 0}
                        data-tab-panel={tab}
                      >
                        <div className="w-layout-grid pricing_grid">
                          {PLANS.map(({ key, icon }) => (
                            <div key={key} className={`pricing_card ${key === "pro" ? "is-pro" : ""}`} data-glow="">
                              <div className="pricing_card-plan">
                                <div
                                  className={`icon-wrap ${key === "pro" ? "w-variant-fff49c35-5622-4259-199c-6d9d85dc0e51" : ""}`}
                                >
                                  <img src={icon} alt="" width="24" height="24" className="icon-1x1-medium" />
                                  <img src="/home/pricing-gradient.webp" alt="" className="icon_gradient" />
                                </div>
                                <div className="text-xl">{t(`${key}.name`)}</div>
                                {key === "pro" && <span className="pricing-popular">{t("popular")}</span>}
                              </div>
                              <div className="pricing_card-price">
                                <div className="text-price" data-price="">
                                  {euros(PRICES[key][period])}
                                </div>
                                <div className="text-color-alternate period_mask">
                                  <span data-period="">{t(period === "month" ? "perMonth" : "perYear")}</span>
                                </div>
                              </div>
                              <div className="text-color-alternate">{t(`${key}.pitch`)}</div>
                              <div className="pricing_list">
                                {ITEMS.map((i) => (
                                  <div key={i} className="pricing_item">
                                    <img
                                      src="/home/pricing-tick-circle.svg"
                                      alt=""
                                      width="20"
                                      height="20"
                                      className="check"
                                    />
                                    <div className="text-sm">{t(`${key}.items.${i}`)}</div>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <FillButton href={signUp} className={key === "pro" ? "btn--lime" : "btn--white"}>
                                  {t("start")}
                                </FillButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
