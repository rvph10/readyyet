import { getTranslations } from "next-intl/server";
import { signInUrl } from "@/lib/sign-in-url";
import "@/temlis/hirely-325/styles.css";
import { ChipButton } from "../ChipButton";
import "./final-cta.css";

// Hirely's "Call-to-Action" (Temlis), markup as bought, with Ledger's button
// in place of its own and its two stickers in lime and pine. Its script,
// /temlis/hirely-325/scroll-reveal.js, opens the stickers; the rest enters
// like every section, through data-entrance (lib/motion/reveal.ts).
export async function FinalCta() {
  const t = await getTranslations("home.finalCta");
  const signIn = await signInUrl();
  const [a, b] = [t("row1.0"), t("row1.1")];
  const [c, d, e] = [t("row2.0"), t("row2.1"), t("row2.2")];

  return (
    <div data-tmls="tmfp_abvkdjg4m5jh437s" data-temlis="hirely-325">
      <div className="page-wrapper">
        <section className="section_cta bg-dark">
          <div className="padding-section-medium"></div>
          <div className="padding-global">
            <div className="container-large vertical-center" data-entrance-group="">
              <h2 className="cta_header" data-entrance="rows">
                <span className="cta_header-row">
                  <span className="h1">{a}</span>
                  <span className="h1">{b}</span>
                </span>
                <span className="cta_header-row">
                  <span className="h1">{c}</span>
                  <img src="/home/cta-sticker-pine.svg" loading="lazy" alt="" className="cta_img" />
                  <span className="h1">{d}</span>
                  <img src="/home/cta-sticker-white.svg" loading="lazy" alt="" className="cta_img" />
                  <span className="h1">{e}</span>
                </span>
                <span className="h1">{t("row3")}</span>
              </h2>
              <div className="spacer">
                <div className="spacer-desktop"></div>
                <div className="spacer-tablet"></div>
                <div className="spacer-mobile"></div>
              </div>
              <div data-entrance="">
                <ChipButton href={signIn}>{t("start")}</ChipButton>
              </div>
            </div>
          </div>
          <div className="padding-section-medium"></div>
        </section>
      </div>
    </div>
  );
}
