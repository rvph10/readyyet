import { getTranslations } from "next-intl/server";
import { APP_URL } from "@/lib/app-url";
import "@/temlis/lumoras-699/styles.css";
import { ChipButton } from "../ChipButton";
import "./trades.css";

const TRADES = ["shoe", "pressing", "tailoring", "electronics", "watch", "garage", "appliance", "framing"] as const;

// Lumoras' "Use Case Card Slider" (Temlis), markup as bought, with Ledger's
// button in place of its own and no arrows: the row scrolls with the page
// instead (ADR 0134, lib/motion/trades-scroll.ts). Its reveals are
// /temlis/lumoras-699/animations.js.
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
                <div className="header_one">
                  <div className="max-heading is-38rem" data-reveal="">
                    <h2>{t("title")}</h2>
                  </div>
                  <div data-reveal="" data-reveal-delay="200">
                    <ChipButton href={`${APP_URL}/sign-in`}>{t("cta")}</ChipButton>
                  </div>
                </div>
                <div className="spacer">
                  <div className="spacer-desktop" />
                  <div className="spacer-tablet" />
                  <div className="spacer-mobile" />
                </div>
                <div className="slider" role="group" aria-label={t("label")} data-trades="" data-reveal="">
                  <div className="slider-mask is-solutions w-slider-mask swiper">
                    <div className="swiper-wrapper">
                      {TRADES.map((trade) => (
                        <div key={trade} className="slide-item w-slide swiper-slide">
                          <div className="solutions_card">
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
