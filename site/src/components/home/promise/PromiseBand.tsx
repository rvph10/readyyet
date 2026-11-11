import { getTranslations } from "next-intl/server";
import { noOrphan } from "@/lib/typography";
import "@/temlis/ledger-781/styles.css";
import "./promise.css";

// Ledger's "Dark About Statement Split" (Temlis), markup as bought, without
// its avatars and user count: ReadyYet has no such numbers to show yet. Its
// script is /temlis/ledger-781/animations.js.
export async function PromiseBand() {
  const t = await getTranslations("home.promise");

  return (
    <div data-tmls="tmfp_zh5jun5so7vmmaer" data-temlis="ledger-781">
      <section className="about" data-astro-cid-oxgmilyn="">
        <div className="about__inner container container--padded" data-astro-cid-oxgmilyn="">
          <div className="about__lead" data-astro-cid-oxgmilyn="">
            <p className="section-label" data-astro-cid-oxgmilyn="">
              {t("label")}
            </p>
            <p className="t-heading-md about__statement" data-astro-cid-oxgmilyn="">
              {noOrphan(t("statement"))}
            </p>
          </div>
          <div className="about__aside" data-astro-cid-oxgmilyn="">
            <div className="about__frame" data-astro-cid-oxgmilyn="">
              <ReadyNotice title={t("art.title")} text={t("art.text")} />
            </div>
            <div className="about__proof" data-astro-cid-oxgmilyn="">
              <div className="about__proof-text" data-astro-cid-oxgmilyn="">
                <p className="body-text about__note" data-astro-cid-oxgmilyn="">
                  {noOrphan(t("note"))}
                </p>
              </div>
              <a className="btn btn--white btn--chip" href="#how-it-works" data-astro-cid-oxgmilyn="">
                <span className="btn__label" data-astro-cid-oxgmilyn="">
                  {t("cta")}
                </span>
                <span className="btn__chip" aria-hidden="true" data-astro-cid-oxgmilyn="">
                  <img src="/home/icon-arrow-right.svg" alt="" width="24" height="24" data-astro-cid-oxgmilyn="" />
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// In place of the template's photo, at its 602 by 350 crop: the email a
// Customer gets when their item is ready.
function ReadyNotice({ title, text }: { title: string; text: string }) {
  return (
    <svg
      className="about__media promise-art"
      viewBox="0 0 602 350"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-astro-cid-oxgmilyn=""
    >
      <rect width="602" height="350" fill="#d6ff53" />
      <rect x="36" y="85" width="530" height="180" rx="36" fill="#fff" />
      <rect x="68" y="117" width="116" height="116" rx="28" fill="#17423a" />
      <path
        d="M106 175l15 15 30-30"
        fill="none"
        stroke="#d6ff53"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="212" y="168" fontSize="30" fontWeight="600" fill="#1e1e1e">
        {title}
      </text>
      <text x="212" y="208" fontSize="22" fill="#565656">
        {text}
      </text>
    </svg>
  );
}
