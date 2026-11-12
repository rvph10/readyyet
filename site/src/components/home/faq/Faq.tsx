import { getTranslations } from "next-intl/server";
import { noOrphan } from "@/lib/typography";
import "@/temlis/strivo-833/styles.css";
import "./faq.css";

const QUESTIONS = ["app", "software", "notified", "sms", "start", "afterTrial", "shops"] as const;

// Strivo's "Two-Column Accordion FAQ" (Temlis), markup as bought: native
// <details> sharing one name, so opening one closes the others. It enters
// like every section, through data-entrance (lib/motion/reveal.ts).
export async function Faq() {
  const t = await getTranslations("home.faq");

  return (
    <div data-tmls="tmfp_mknnhtwkzzko32vs" data-temlis="strivo-833">
      <section className="faq" id="faq" aria-labelledby="faq-title" data-astro-cid-z6gx6xcw="">
        <div className="container faq__inner" data-entrance-group="" data-astro-cid-z6gx6xcw="">
          <h2 id="faq-title" className="faq__title t-display" data-entrance="title" data-astro-cid-z6gx6xcw="">
            {noOrphan(t("title"))}
          </h2>
          <div className="faq__list" data-astro-cid-z6gx6xcw="">
            {QUESTIONS.map((key, i) => (
              <details
                key={key}
                className="faq__item"
                name="faq"
                open={i === 0}
                data-entrance=""
                data-astro-cid-z6gx6xcw=""
              >
                <summary className="faq__q" data-astro-cid-z6gx6xcw="">
                  <span className="t-display" data-astro-cid-z6gx6xcw="">
                    {noOrphan(t(`${key}.q`))}
                  </span>
                  <span className="faq__disc" aria-hidden="true" data-astro-cid-z6gx6xcw="">
                    <svg
                      className="faq__plus"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      fill="none"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M12 20V12M12 12V4M12 12H20M12 12H4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                    <svg
                      className="faq__minus"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      fill="none"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M20 12H4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="faq__a t-body" data-astro-cid-z6gx6xcw="">
                  {noOrphan(t(`${key}.a`))}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
