import { readFileSync } from "node:fs";
import path from "node:path";
import { getTranslations } from "next-intl/server";
import { noOrphan } from "@/lib/typography";
import { CtaPair } from "../CtaPair";
import { Nav } from "../Nav";
import { HeroFloats } from "./HeroFloats";
import { PhoneScreen } from "./PhoneScreen";
import "./hero.css";

// The device's frame is inlined, as Ledger has it. Read at build time, the
// pages are static.
const svg = (name: string) => readFileSync(path.join(process.cwd(), "src/components/home/hero", name), "utf8");

export async function Hero() {
  const t = await getTranslations("home.hero");

  return (
    <section className="hero">
      <Nav />

      <div className="hero__intro container container--padded">
        <div className="hero__head">
          <h1 className="t-display hero__title">{noOrphan(t("title"))}</h1>
          <p className="body-text hero__lede">{noOrphan(t("lede"))}</p>
        </div>
        <CtaPair />
        <ul className="hero__assure">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <img src="/home/pricing-check.svg" alt="" width="20" height="20" />
              {t(`assurances.${i}`)}
            </li>
          ))}
        </ul>
      </div>

      <div className="hero__stage container container--bleed">
        <div className="hero__pin">
          <div className="hero__panelbox">
            <div className="hero__panel" role="img" aria-label={t("artLabel")}>
              <div className="hero__camera">
                <img
                  className="hero__mat"
                  src="/home/hero-backdrop.webp"
                  alt=""
                  width="2655"
                  height="3391"
                  fetchPriority="high"
                />
                <div className="hero__mat-grain" />
              </div>
              <div className="hero__props">
                <div className="hero__swing">
                  <img className="hero__coins" src="/home/hero-trades.webp" alt="" width="1255" height="1644" />
                </div>
                <div className="hero__swing">
                  <div className="hero__cards">
                    <img src="/home/hero-tiles.webp" alt="" width="1662" height="1402" />
                  </div>
                </div>
              </div>
            </div>
            <div className="hero__phonelayer">
              <div className="hero__camera hero__camera--phone">
                <div className="hero__phone">
                  <img
                    className="hero__phone-shadow"
                    src="/home/hero-phone-shadow.webp"
                    alt=""
                    width="786"
                    height="1318"
                  />
                  <div
                    className="hero__device-base"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: svg("hero-phone-base.svg") }}
                  />
                  <div className="hero__device">
                    <PhoneScreen />
                  </div>
                </div>
              </div>
            </div>
            <HeroFloats />
            <div className="hero__burst" aria-hidden="true">
              <div className="hero__burst-pill">
                <img src="/home/logo.svg" alt="" width="28" height="28" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
