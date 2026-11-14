import { getTranslations } from "next-intl/server";
import { ChipButton } from "@/components/home/ChipButton";
import { FillButton } from "@/components/home/FillButton";
import { Nav } from "@/components/home/Nav";
import { noOrphan } from "@/lib/typography";
import { TRADES, type Trade } from "@/lib/trades";
import { Icon } from "./Icon";

// The Customer's tracking page (web/src/app/(tracking)/t/[code]) for this
// trade, drawn on a phone at the step past Received.
const NOW = 1;

export async function TradeHero({ trade, signIn }: { trade: Trade; signIn: string }) {
  const all = await getTranslations("tradePage");
  const t = (name: string) => all(`${trade}.${name}`);
  const page = (name: string, values?: Record<string, string>) => all(`page.${name}`, values);
  const steps = ["RECEIVED", ...TRADES[trade].steps, "READY"];

  return (
    <header className="trade-hero container container--padded">
      <Nav />
      <div className="trade-hero__grid" data-entrance-group="">
        <div className="trade-hero__copy">
          <p className="trade-label" data-entrance="">
            {t("label")}
          </p>
          <h1 className="trade-hero__title" data-entrance="title">
            {noOrphan(t("title"))}
          </h1>
          <p className="trade-hero__lead" data-entrance="">
            {noOrphan(t("lead"))}
          </p>
          <div className="cta" data-entrance="">
            <ChipButton href={signIn}>{page("start")}</ChipButton>
            <FillButton href="#pricing" className="btn--muted">
              {page("pricing")}
            </FillButton>
          </div>
          <ul className="trade-hero__assure" data-entrance="">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <Icon name="check" className="trade-hero__check" />
                {page(`assurances.${i}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="trade-hero__stage" data-entrance="">
          <div className="trade-phone" aria-hidden="true">
            <div className="trade-phone__screen">
              <div className="trade-phone__shop">
                <span className="trade-phone__initials">{initials(t("demo.shop"))}</span>
                {t("demo.shop")}
              </div>
              <div className="trade-phone__status">
                <span>{t("demo.item")}</span>
                <strong>{page(`statuses.${steps[NOW]}`)}</strong>
                <span>{page("phone.expected", { date: t("demo.expected") })}</span>
              </div>
              <div className="trade-phone__card">
                <p className="trade-phone__heading">{page("phone.progress")}</p>
                <ol className="trade-phone__steps">
                  {steps.map((code, index) => (
                    <li key={code} className={index < NOW ? "is-done" : index === NOW ? "is-now" : undefined}>
                      <span className="trade-phone__dot">{index < NOW && <Icon name="check" />}</span>
                      {page(`statuses.${code}`)}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <div className="trade-float trade-float--ready" aria-hidden="true">
            <span className="trade-float__icon">
              <Icon name="message" />
            </span>
            <span>
              <strong>{page("floats.readyTitle")}</strong>
              {t("demo.readyMail")}
            </span>
          </div>
          <div className="trade-float trade-float--reminder" aria-hidden="true">
            <span className="trade-float__icon trade-float__icon--lime">
              <Icon name="notification" />
            </span>
            <span>
              <strong>{page("floats.reminderTitle")}</strong>
              {page("floats.reminderText")}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
