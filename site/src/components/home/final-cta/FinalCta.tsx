import { getTranslations } from "next-intl/server";
import { APP_URL } from "@/lib/app-url";
import { noOrphan } from "@/lib/typography";
import "@/temlis/ledger-783/styles.css";
import { ChipButton } from "../ChipButton";
import { FillButton } from "../FillButton";
import "./final-cta.css";

// Ledger's "Centered API Pitch With Buttons" (Temlis), markup as bought. Its
// script is /temlis/ledger-783/animations.js.
export async function FinalCta() {
  const t = await getTranslations("home.finalCta");

  return (
    <div data-tmls="tmfp_yb5stswjgxdwqcf7" data-temlis="ledger-783">
      <section className="endpoints" data-astro-cid-6pcum5n3="">
        <div className="endpoints__inner container container--padded" data-astro-cid-6pcum5n3="">
          <div className="endpoints__head" data-astro-cid-6pcum5n3="">
            <p className="section-label endpoints__side" data-astro-cid-6pcum5n3="">
              {t("sideStart")}
            </p>
            <h2 className="t-heading endpoints__title" data-astro-cid-6pcum5n3="">
              {noOrphan(t("title"))}
            </h2>
            <p className="section-label endpoints__side endpoints__side--end" data-astro-cid-6pcum5n3="">
              {t("sideEnd")}
            </p>
          </div>
          <div className="endpoints__frame" data-astro-cid-6pcum5n3="">
            <ReadyTicket item={t("art.item")} ticket={t("art.ticket")} status={t("art.status")} />
          </div>
          <p className="body-text endpoints__lede" data-astro-cid-6pcum5n3="">
            {noOrphan(t("lede"))}
          </p>
          <div className="cta" data-astro-cid-m747vu3z="">
            <ChipButton href={`${APP_URL}/sign-in`}>{t("start")}</ChipButton>
            <FillButton href={`${APP_URL}/sign-in`} className="btn--muted">
              {t("signIn")}
            </FillButton>
          </div>
        </div>
      </section>
    </div>
  );
}

// In place of the template's photo, at its 820 by 529 crop: a Ticket that
// has just turned Ready.
function ReadyTicket({ item, ticket, status }: { item: string; ticket: string; status: string }) {
  return (
    <svg
      className="endpoints__media final-cta-art"
      viewBox="0 0 820 529"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-astro-cid-6pcum5n3=""
    >
      <rect width="820" height="529" fill="#17423a" />
      <rect x="150" y="124" width="520" height="281" rx="40" fill="#fff" />
      <text x="198" y="200" fontSize="26" fill="#565656">
        {ticket}
      </text>
      <text x="198" y="250" fontSize="40" fontWeight="600" fill="#1e1e1e">
        {item}
      </text>
      <line x1="210" y1="330" x2="560" y2="330" stroke="#17423a" strokeWidth="6" />
      {[210, 327, 444].map((cx) => (
        <circle key={cx} cx={cx} cy="330" r="14" fill="#17423a" />
      ))}
      <rect x="520" y="306" width="110" height="48" rx="24" fill="#d6ff53" />
      <text x="575" y="338" textAnchor="middle" fontSize="22" fontWeight="600" fill="#17423a">
        {status}
      </text>
    </svg>
  );
}
