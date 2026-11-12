import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { noOrphan } from "@/lib/typography";
import "@/temlis/serenium-587/styles.css";
import "./promise.css";

const STATS = ["one", "two", "three"] as const;

// Serenium's "Dark Stats Band With Counters" (Temlis), markup as bought, with
// the section label above its paragraph. The figures are placeholders until
// ReadyYet has real ones to show. Its script is /temlis/serenium-587/motion.js.
export async function PromiseBand() {
  const t = await getTranslations("home.promise");

  return (
    <div data-tmls="tmfp_5hxqkk45t2n5dgw5" data-temlis="serenium-587">
      <section className="section_statistics" data-surface="dark" data-reveal="slide-up">
        <div className="container-large">
          <div className="padding-global padding-section-medium">
            <div className="statistics_cotent">
              <div className="stats_wrapper" data-reveal-children="" data-reveal-delay="250" data-reveal-stagger="120">
                {STATS.map((key, i) => (
                  <Fragment key={key}>
                    {i > 0 && (
                      <div className="stats_separator hide-mobile-portrait" data-reveal-child="hairline-y"></div>
                    )}
                    <div className="stats_item">
                      <div className="stats_number-wrap" data-reveal-child="rise-sm">
                        <div className="stats_number" data-counter="">
                          {t(`stats.${key}.value`)}
                        </div>
                        <div className="starts_sub-number">{t(`stats.${key}.unit`)}</div>
                      </div>
                      <div className="stat_description">
                        <div className="text-base">{t(`stats.${key}.label`)}</div>
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>
              <div className="description_wrapper" data-reveal-children="" data-reveal-delay="400">
                <p className="section-label">{t("label")}</p>
                <div className="text-base">{noOrphan(t("statement"))}</div>
                <a href="#how-it-works" className="link">
                  {t("cta")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
