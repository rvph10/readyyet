import { getTranslations } from "next-intl/server";
import { noOrphan } from "@/lib/typography";
import "@/temlis/wilun-559/styles.css";
import {
  EmailStack,
  type FeatureArtText,
  QrGlyph,
  ReviewCard,
  TodayBoard,
  TrackingPhone,
  WorkflowList,
} from "./FeatureArt";
import "./features.css";

const ART_KEYS = [
  "shop",
  "item",
  "status",
  "dropped",
  "repairing",
  "ready",
  "due",
  "emailReady",
  "emailLogged",
  "now",
  "yesterday",
  "received",
  "cleaning",
  "alteration",
  "reviewAsk",
  "reviewCta",
  "hello",
  "todayReady",
  "todayLate",
  "todayDue",
  "needsYou",
  "saysCollected",
  "newFeedback",
  "customerA",
  "customerB",
  "customerC",
] as const;

// Wilun's "Tinted Bento Feature Cards" (Temlis), markup as bought, with
// ReadyYet's artwork drawn in place of its images. Its script is
// /temlis/wilun-559/motion.js.
export async function Features() {
  const t = await getTranslations("home.features");
  const art = Object.fromEntries(ART_KEYS.map((key) => [key, t(`art.${key}`)])) as FeatureArtText;
  const copy = (key: "tracking" | "emails" | "workflow" | "reviews" | "today") => (
    <div className="features_copy">
      <h3 className="display display--card-sm display--left">
        <span className="display_line">
          <span>{t(`${key}.title`)}</span>
        </span>
      </h3>
      <p className="features_body">{noOrphan(t(`${key}.text`))}</p>
    </div>
  );

  return (
    <div data-tmls="tmfp_hhtc3y7fdy36ihjk" data-temlis="wilun-559">
      {/* data-motion sat on <html> in the template; its rules, scoped to the
          wrapper, only match it inside. */}
      <div data-motion="">
        <section id="features" className="section section_features">
          <div className="features_stage" aria-hidden="true">
            <img className="features_backdrop features_backdrop--outer" src="/home/features-arc-outer.svg" alt="" />
            <img className="features_backdrop features_backdrop--inner" src="/home/features-arc-inner.svg" alt="" />
          </div>
          <div className="features_intro reveal-lines">
            <p className="eyebrow">{t("label")}</p>
            <h2 className="display display--hero display--center">
              <span className="display_line">
                <span>{t("headingStart")} </span>
                <span className="tone--orange">{t("headingEnd")}</span>
              </span>
            </h2>
          </div>
          <div className="features_grid">
            <article className="features_card reveal-build tint--peach-deep" data-card="interface">
              <svg
                className="features_deco"
                aria-hidden="true"
                preserveAspectRatio="none"
                overflow="visible"
                width="695.591"
                height="403.627"
                viewBox="0 0 695.591 403.627"
                fill="none"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.8942 81.457C350.159 -129.93 -16.5189 556.92 682.02 308.074"
                  stroke="currentColor"
                  strokeWidth="80.8786"
                />
              </svg>
              {copy("tracking")}
              <TrackingPhone t={art} className="features_phone" />
              <span className="features_badge">
                <QrGlyph />
              </span>
            </article>
            <div className="features_column">
              <article className="features_card reveal-build tint--lilac" data-card="security">
                <svg
                  className="arc features_deco"
                  viewBox="0 0 666.399 333.199"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M636.199 333.199C636.199 293.409 628.362 254.008 613.135 217.246C597.908 180.485 575.589 147.082 547.453 118.946C519.317 90.8098 485.914 68.491 449.152 53.2638C412.391 38.0367 372.99 30.1993 333.199 30.1993C293.409 30.1993 254.008 38.0367 217.246 53.2638C180.485 68.491 147.082 90.8098 118.946 118.946C90.8098 147.082 68.491 180.485 53.2638 217.246C38.0367 254.008 30.1993 293.409 30.1993 333.199"
                    stroke="currentColor"
                    strokeWidth="60.3987"
                  />
                </svg>
                {copy("emails")}
                <EmailStack t={art} className="features_art" />
              </article>
              <div className="features_row">
                <article className="features_card reveal-build tint--blue-deep" data-card="automated">
                  <svg
                    className="features_deco"
                    aria-hidden="true"
                    preserveAspectRatio="none"
                    overflow="visible"
                    width="288.455"
                    height="411.621"
                    viewBox="0 0 288.455 411.621"
                    fill="none"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.1493 11.1493C26.4092 51.6211 64.5721 127.31 126.991 99.9218C205.016 65.6867 98.8139 -31.0474 70.4637 41.8017C39.0151 122.613 86.5611 185.387 126.991 216.958C186.631 263.53 310.971 262.25 268.709 189.889C226.446 117.527 106.027 198.777 170.781 306.129C211.185 373.114 230.36 395.963 234.474 400.474"
                      stroke="currentColor"
                      strokeWidth="22.2926"
                    />
                  </svg>
                  {copy("workflow")}
                  <WorkflowList t={art} className="features_art" />
                </article>
                <article className="features_card reveal-build tint--lemon" data-card="transactions">
                  <svg
                    className="features_deco"
                    aria-hidden="true"
                    preserveAspectRatio="none"
                    overflow="visible"
                    width="341.527"
                    height="343.021"
                    viewBox="0 0 341.527 343.021"
                    fill="none"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.4438 259.752C19.8198 184.603 47.5258 31.6759 163.342 21.1551C308.112 8.0041 369.265 178.336 278.16 277.282C187.054 376.227 54.1404 299.2 102.189 178.962C150.238 58.7246 278.16 178.962 172.702 234.076"
                      stroke="currentColor"
                      strokeWidth="40.8671"
                    />
                  </svg>
                  {copy("reviews")}
                  <ReviewCard t={art} className="features_art" />
                </article>
              </div>
            </div>
            <article className="features_card reveal-build tint--peach-deep" data-card="today">
              <svg
                className="features_deco"
                aria-hidden="true"
                preserveAspectRatio="none"
                overflow="visible"
                viewBox="0 0 695.591 403.627"
                fill="none"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.8942 81.457C350.159 -129.93 -16.5189 556.92 682.02 308.074"
                  stroke="currentColor"
                  strokeWidth="80.8786"
                />
              </svg>
              {copy("today")}
              <TodayBoard t={art} className="features_art" />
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
