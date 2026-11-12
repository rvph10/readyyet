import { getTranslations } from "next-intl/server";
import { APP_URL } from "@/lib/app-url";
import "@/temlis/contelas-518/styles.css";
import { ChipButton } from "../ChipButton";
import "./pricing.css";

const PLANS = [
  { key: "essentiel", frame: "bg-primary" },
  { key: "pro", frame: "bg-dark" },
] as const;

// Contelas' "Two Plan Pricing Cards" (Temlis), markup as bought, with
// Ledger's button in place of its own and the tag's word written out so it
// can be translated. Prices are the app's (plan-prices.ts in web, ADR 0031).
// It enters like every section, through data-entrance (lib/motion/reveal.ts).
export async function Pricing() {
  const t = await getTranslations("home.pricing");
  const signUp = `${APP_URL}/sign-in`;

  return (
    <div data-tmls="tmfp_todrbqozfsyjmpf6" data-temlis="contelas-518">
      <div className="page-wrapper">
        <section className="section_pricing" id="pricing">
          <div className="padding-section-medium"></div>
          <div className="padding-global">
            <div className="container-small">
              <div className="header" data-entrance-group="">
                <h2 data-entrance="title">{t("title")}</h2>
                <div className="spacer-small"></div>
                <div className="text-color-secondary" data-entrance="">
                  {t("intro")}
                </div>
              </div>
              <div className="gap-section-medium"></div>
              <div className="w-layout-grid grid_pricing" role="list" data-entrance-group="">
                {PLANS.map(({ key, frame }) => (
                  <div key={key} className={`box ${frame}`} role="listitem" data-entrance="">
                    <div className="padding-small is-top">
                      <div className="padding-medium">
                        <div className={key === "pro" ? "text-lg text-color-on-primary" : "text-lg"}>
                          {t(`${key}.name`)}
                        </div>
                      </div>
                      <div className="box-small bg-white">
                        <div className="padding-medium">
                          <div className="pricing_content">
                            <div>
                              <div className="text-5xl">
                                {t(`${key}.price`)}{" "}
                                <span className="text-base text-color-secondary text-weight-regular">
                                  {t("perMonth")}
                                </span>
                              </div>
                              <div className="text-sm text-color-secondary">{t(`${key}.yearly`)}</div>
                            </div>
                            <div className="text-color-secondary">{t(`${key}.pitch`)}</div>
                            <div className="pricing_list-item">
                              {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="pricing_item">
                                  <img
                                    src="/home/pricing-check.svg"
                                    loading="lazy"
                                    alt=""
                                    width="20"
                                    height="20"
                                    className="icon-1x1-small"
                                  />
                                  <div className="text-sm">{t(`${key}.items.${i}`)}</div>
                                </div>
                              ))}
                            </div>
                            <div data-wf--button--variant="base">
                              <ChipButton href={signUp}>{t("start")}</ChipButton>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {key === "pro" && (
                      <>
                        <img src="/home/pricing-pin.svg" loading="lazy" alt="" width="23" height="44" className="pin" />
                        <PopularTag label={t("popular")} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="padding-section-medium"></div>
        </section>
      </div>
    </div>
  );
}

// The template's luggage tag, in lime, with its word as text instead of
// outlines.
function PopularTag({ label }: { label: string }) {
  return (
    <svg className="tag" viewBox="0 0 108 41" aria-hidden="true">
      <path
        d="M99.9039 0.214355C104.322 0.214355 107.904 3.79608 107.904 8.21436V32.2144C107.904 36.6326 104.322 40.2144 99.9039 40.2144L21.2174 40.2144C19.0959 40.2143 17.0613 39.3716 15.5611 37.8716L3.5611 25.8716C0.436908 22.7474 0.436908 17.6813 3.5611 14.5571L15.5611 2.55713C17.0613 1.05711 19.0959 0.214455 21.2174 0.214355L99.9039 0.214355ZM12.4039 14.7144C9.36637 14.7144 6.90388 17.1768 6.90388 20.2144C6.90388 23.2519 9.36637 25.7143 12.4039 25.7144C15.4414 25.7144 17.9039 23.2519 17.9039 20.2144C17.9039 17.1768 15.4414 14.7144 12.4039 14.7144Z"
        fill="#d6ff53"
      />
      <text x="62" y="25.5" textAnchor="middle" fontSize="13" fontWeight="600" fill="#17423a">
        {label}
      </text>
    </svg>
  );
}
