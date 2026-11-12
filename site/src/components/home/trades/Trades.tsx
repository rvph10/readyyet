import { getTranslations } from "next-intl/server";
import { APP_URL } from "@/lib/app-url";
import "@/temlis/lumoras-699/styles.css";
import { ChipButton } from "../ChipButton";
import "./trades.css";

const TRADES = ["shoe", "pressing", "tailoring", "electronics", "watch", "garage", "appliance", "framing"] as const;

// Lumoras' "Use Case Card Slider" (Temlis), markup as bought, with Ledger's
// button in place of its own. Its slider is /temlis/lumoras-699/slider.js
// (Swiper); it enters like every section, through data-entrance
// (lib/motion/reveal.ts).
export async function Trades() {
  const t = await getTranslations("home.trades");

  return (
    <div data-tmls="tmfp_ngj73s52iqhloxrc" data-temlis="lumoras-699">
      <div className="page-wrapper">
        <section className="section_solutions">
          <div className="padding-section-medium" />
          <div className="padding-global">
            <div className="container-large">
              <div>
                <div className="header_one" data-entrance-group="">
                  <div className="max-heading is-38rem">
                    <h2 data-entrance="title">{t("title")}</h2>
                  </div>
                  <div data-entrance="">
                    <ChipButton href={`${APP_URL}/sign-in`}>{t("cta")}</ChipButton>
                  </div>
                </div>
                <div className="spacer">
                  <div className="spacer-desktop" />
                  <div className="spacer-tablet" />
                  <div className="spacer-mobile" />
                </div>
                <div
                  className="slider"
                  role="group"
                  aria-roledescription="carousel"
                  aria-label={t("label")}
                  data-slider=""
                  data-entrance-group=""
                >
                  <div className="slider-mask is-solutions w-slider-mask swiper">
                    <div className="swiper-wrapper">
                      {TRADES.map((trade) => (
                        <div key={trade} className="slide-item w-slide swiper-slide">
                          <div className="solutions_card" data-entrance="">
                            <div className="icon-wrapper w-variant-8b30cf3b-98bc-9c9f-e71b-20d4e9e8b609">
                              <img
                                src={`/home/trade-${trade}.svg`}
                                loading="lazy"
                                decoding="async"
                                alt=""
                                className="icon-size w-variant-8b30cf3b-98bc-9c9f-e71b-20d4e9e8b609"
                              />
                            </div>
                            <div className="solutions_card-info">
                              <h3 className="h5">{t(`${trade}.title`)}</h3>
                              <div className="text-color-secondary">{t(`${trade}.text`)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button type="button" className="arrow" data-entrance="" data-slider-prev="" aria-label={t("previous")}>
                    <svg viewBox="0 0 24 24" fill="none" className="icon-1x1-main" aria-hidden="true">
                      <path
                        d="M10.5 19.5L11.5575 18.4425L5.8725 12.75H21V11.25H5.8725L11.5575 5.5575L10.5 4.5L3 12L10.5 19.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button type="button" className="arrow is-right" data-entrance="" data-slider-next="" aria-label={t("next")}>
                    <svg viewBox="0 0 24 24" fill="none" className="icon-1x1-main" aria-hidden="true">
                      <path
                        d="M13.5 19.5L12.4425 18.4425L18.1275 12.75H3V11.25H18.1275L12.4425 5.5575L13.5 4.5L21 12L13.5 19.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="padding-section-medium" />
        </section>
      </div>
    </div>
  );
}
