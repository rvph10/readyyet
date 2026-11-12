import { getTranslations } from "next-intl/server";
import { noOrphan } from "@/lib/typography";
import "@/temlis/payable-626/styles.css";
import { type ArtText, CustomerRow, ItemRow, QrCard, ReadyEmail, ReadyTrack, TrackingCard } from "./StepArt";
import "./steps.css";

const ART_KEYS = [
  "customer",
  "qr",
  "item",
  "due",
  "create",
  "yourItem",
  "dropped",
  "diagnosis",
  "repairing",
  "ready",
  "scan",
  "ticket",
  "inProgress",
  "readyAt",
  "readyTitle",
  "emailSent",
] as const;

// Payable's "Three Steps With Layered Art" (Temlis), markup as bought. The
// data-anim and data-parallax attributes drive its script,
// /temlis/payable-626/animations.js; the header enters like every section's,
// through data-entrance (lib/motion/reveal.ts).
export async function Steps() {
  const t = await getTranslations("home.steps");
  const art = Object.fromEntries(ART_KEYS.map((key) => [key, t(`art.${key}`)])) as ArtText;
  const step = (n: 1 | 2 | 3) => (
    <div className="card-text-wrap">
      <div className="card-title-wrap">
        <div className="text-base text-weight-bold">{t("stepLabel", { n })}</div>
        <h3 className="text-2xl text-weight-medium">{t(`step${n}.title`)}</h3>
      </div>
      <div className="text-base text-color-secondary">{t(`step${n}.text`)}</div>
    </div>
  );

  return (
    <div data-tmls="tmfp_4lwqw7vuod4ix5k5" data-temlis="payable-626">
      <div className="page-wrapper">
        <div className="main-wrapper">
          <section className="section_steps" id="how-it-works">
            <div className="padding-global padding-section-medium">
              <div className="container-medium">
                <div className="steps_wrap">
                  <div className="steps_header" data-entrance-group="">
                    <h2 className="text-5xl text-align-center" data-entrance="title">
                      {noOrphan(t("title"))}
                    </h2>
                    <div className="steps_description" data-entrance="">
                      <div className="text-base text-align-center text-color-secondary">{t("intro")}</div>
                    </div>
                  </div>
                  <div className="steps_cards-wrap">
                    <div className="steps_card" data-anim="hold">
                      <div className="card-image-wrap" data-parallax="">
                        <div className="visual-back" data-parallax-from="0,0" data-parallax-to="0,-10">
                          <CustomerRow t={art} />
                        </div>
                        <div className="visual-front" data-parallax-from="0,30" data-parallax-to="0,-50">
                          <ItemRow t={art} />
                        </div>
                      </div>
                      {step(1)}
                    </div>
                    <div className="steps_card" data-anim="hold">
                      <div className="card-image-wrap" data-parallax="">
                        <div className="visual-left" data-parallax-from="5,0" data-parallax-to="0,-15">
                          <QrCard t={art} />
                        </div>
                        <div className="visual-right" data-parallax-from="-5,0" data-parallax-to="0,-24">
                          <TrackingCard t={art} />
                        </div>
                      </div>
                      {step(2)}
                    </div>
                    <div
                      id="w-node-fa6170d2-25f3-037d-10a8-2b68457489c7-31eed7fb"
                      className="steps_card"
                      data-anim="hold"
                    >
                      <div className="card-image-wrap is-third" data-parallax="">
                        <div className="visual-top-left" data-parallax-from="10,10" data-parallax-to="0,-5">
                          <ReadyTrack t={art} />
                        </div>
                        <div className="visual-bottom-right" data-parallax-from="-10,-10" data-parallax-to="0,5">
                          <ReadyEmail t={art} />
                        </div>
                      </div>
                      {step(3)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
