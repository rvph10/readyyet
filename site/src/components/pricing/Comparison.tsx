import { getTranslations } from "next-intl/server";
import "@/temlis/corevia-762/styles.css";
import "./comparison.css";

type Cell = boolean | "unlimited" | "two" | "tradeSteps" | "yourSteps";

// What each plan holds (ADR 0031, ADR 0141), in the order a shop meets it.
const ROWS: [string, Cell, Cell][] = [
  ["tickets", "unlimited", "unlimited"],
  ["tracking", true, true],
  ["handover", true, true],
  ["emails", true, true],
  ["reminders", true, true],
  ["photos", true, true],
  ["team", "two", "unlimited"],
  ["profiles", true, true],
  ["steps", "tradeSteps", "yourSteps"],
  ["copySteps", false, true],
  ["reviews", false, true],
  ["export", true, true],
];

// Corevia's "Three-Plan Feature Comparison Table" (Temlis), markup as bought,
// for two plans in Ledger's look (comparison.css). It enters like every
// section, through data-entrance (lib/motion/reveal.ts), and scrolls sideways
// on a phone as Corevia does.
export async function Comparison() {
  const [t, plans] = await Promise.all([getTranslations("pricingPage"), getTranslations("home.pricing")]);
  const cell = (value: Cell) =>
    value === true ? (
      <div className="pricing_icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 23 23" fill="none" className="pricing_check">
          <title>{t("included")}</title>
          <path
            d="M4.90366 10.9495L9.54651 15.5924L17.7608 6.71484"
            stroke="currentColor"
            strokeWidth="1.9898"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ) : value === false ? (
      <div className="text-base comparison-none">
        <span aria-hidden="true">–</span>
        <span className="sr-only">{t("notIncluded")}</span>
      </div>
    ) : (
      <div className="text-base">{t(`values.${value}`)}</div>
    );

  return (
    <div data-tmls="tmfp_n73trk3tkq66jvtu" data-temlis="corevia-762">
      <div className="page-wrapper">
        <section className="section_plans" aria-labelledby="comparison-title">
          <div className="container container--padded comparison-head" data-entrance-group="">
            <h2 id="comparison-title" className="t-display" data-entrance="title">
              {t("tableTitle")}
            </h2>
          </div>
          <div className="padding-pricing-table">
            <div className="container-medium">
              <div className="pricing_table-wrap" data-entrance="">
                <div className="pricing_table" role="table" aria-labelledby="comparison-title">
                  <div className="pricing_list-top" role="row">
                    <div className="block_features-top" role="columnheader">
                      <span className="sr-only">{t("feature")}</span>
                    </div>
                    <div className="block_plan-wrap">
                      {(["essentiel", "pro"] as const).map((plan) => (
                        <div key={plan} className="block_plan-top" role="columnheader">
                          <div className="text-xl text-weight-medium">{plans(`${plan}.name`)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {ROWS.map(([key, essentiel, pro]) => (
                    <div key={key} className="pricing_list-row" role="row">
                      <div className="block_features" role="rowheader">
                        <div className="text-xl">{t(`rows.${key}`)}</div>
                      </div>
                      <div className="block_plan-wrap">
                        <div className="block_plan" role="cell">
                          {cell(essentiel)}
                        </div>
                        <div className="block_plan is-right" role="cell">
                          {cell(pro)}
                        </div>
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
