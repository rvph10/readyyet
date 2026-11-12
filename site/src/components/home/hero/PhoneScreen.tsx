import { getTranslations } from "next-intl/server";
import { SCREEN_OUTLINE, STATUS_BAR } from "./phone-chrome";

const STEPS = ["received", "diagnosis", "approval", "repair", "ready"] as const;
const stepY = (i: number) => 374 + i * 40;
const PHOTOS = [40, 144, 248];

const INK = "#1e1e1e";
const PINE = "#17423a";
const LIME = "#d6ff53";
const BORDER = "rgba(30, 30, 30, 0.12)";

const check = (x: number, y: number) => `M${x - 5} ${y}l3.5 3.5L${x + 5.5} ${y - 4.5}`;

// The Customer's tracking page (web/src/app/(tracking)/t/[code]) as the hero's
// phone plays it. It's drawn in its last state, ready with every photo in,
// which is what reduced motion shows; hero-scroll.ts starts it from the drop-off.
// Screen units are a 390 by 844 phone, fitted into Ledger's device frame.
export async function PhoneScreen() {
  const t = await getTranslations("home.hero.phone");

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 322.05 665.5" aria-hidden="true">
      <defs>
        <clipPath id="phone-screen">
          <path d={SCREEN_OUTLINE} />
        </clipPath>
        <clipPath id="phone-status-clip">
          <rect width="358" height="48" x="16" y="180" />
        </clipPath>
        <clipPath id="phone-cta-clip">
          <rect width="342" height="32" x="24" y="752" className="phone__cta-clip" rx="8" />
        </clipPath>
        {PHOTOS.map((x, i) => (
          <clipPath key={x} id={`phone-photo-${i}`}>
            <rect width="94" height="94" x={x} y="620" rx="14" />
          </clipPath>
        ))}
      </defs>
      <g clipPath="url(#phone-screen)">
        <g className="phone__screen" transform="translate(12.6953 10.3438) scale(0.760074 0.763435)">
          <rect width="390" height="844" fill="#f3f3f3" />
          <g dangerouslySetInnerHTML={{ __html: STATUS_BAR }} />

          <rect width="44" height="44" x="20" y="70" fill={PINE} rx="12" />
          <text x="42" y="98" fill={LIME} fontSize="16" fontWeight="700" textAnchor="middle">
            AL
          </text>
          <text x="76" y="98" fill={INK} fontSize="17" fontWeight="600">
            {t("shop")}
          </text>

          <rect width="357" height="159" x="16.5" y="130.5" fill="#fff" stroke={BORDER} rx="23.5" />
          <rect width="358" height="160" x="16" y="130" fill={LIME} className="phone__ready-fill" rx="24" />
          <text x="40" y="168" fill={INK} fontSize="14">
            {t("item")}
          </text>
          <g clipPath="url(#phone-status-clip)">
            {STEPS.map((step, i) => (
              <text
                key={step}
                x="40"
                y="216"
                fill={INK}
                fontSize="30"
                fontWeight="700"
                letterSpacing="-0.6"
                className="phone__status-label"
                opacity={i === STEPS.length - 1 ? 1 : 0}
              >
                {step === "ready" ? t("readyTitle") : t(`steps.${step}`)}
              </text>
            ))}
          </g>
          <text x="40" y="258" fill={INK} fontSize="14" className="phone__expected" opacity="0">
            {t("expected")}
          </text>
          <text x="40" y="258" fill={INK} fontSize="14" fontWeight="600" className="phone__open">
            {t("openUntil")}
          </text>

          <rect width="357" height="249" x="16.5" y="304.5" fill="#fff" stroke={BORDER} rx="23.5" />
          <text x="40" y="340" fill={INK} fontSize="16" fontWeight="600">
            {t("progress")}
          </text>
          {STEPS.slice(1).map((step, i) => (
            <g key={step}>
              <rect width="4" height="16" x="50" y={stepY(i) + 12} fill="#e1e1e1" rx="2" />
              <rect width="4" height="16" x="50" y={stepY(i) + 12} fill={PINE} rx="2" className="phone__line" />
            </g>
          ))}
          {STEPS.map((step, i) => {
            const y = stepY(i);
            const last = i === STEPS.length - 1;
            return (
              <g key={step}>
                <circle cx="52" cy={y} r="11" fill="#fff" stroke="#c9c9c9" strokeWidth="2" />
                <g className="phone__step-now" opacity="0">
                  <circle cx="52" cy={y} r="12" fill={LIME} stroke={PINE} strokeWidth="2.5" />
                  <circle cx="52" cy={y} r="4" fill={PINE} />
                </g>
                <g className="phone__step-done">
                  <circle cx="52" cy={y} r="12" fill={last ? LIME : PINE} />
                  <path
                    stroke={last ? PINE : "#fff"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.4"
                    d={check(52, y)}
                  />
                </g>
                <text x="78" y={y + 5} fill={INK} fontSize="15" fontWeight="500">
                  {t(`steps.${step}`)}
                </text>
              </g>
            );
          })}

          <rect width="357" height="159" x="16.5" y="568.5" fill="#fff" stroke={BORDER} rx="23.5" />
          <text x="40" y="604" fill={INK} fontSize="16" fontWeight="600">
            {t("photos")}
          </text>
          {PHOTOS.map((x, i) => (
            <g key={x} className="phone__photo" clipPath={`url(#phone-photo-${i})`}>
              <image
                width="94"
                height="94"
                x={x}
                y="620"
                href={`/home/hero-photo-${i + 1}.webp`}
                preserveAspectRatio="xMidYMid slice"
              />
            </g>
          ))}

          <g className="phone__cta">
            <rect width="358" height="48" x="16" y="744" fill={PINE} rx="16" />
            <text
              x="195"
              y="773"
              fill="#fff"
              fontSize="15"
              fontWeight="600"
              textAnchor="middle"
              className="phone__cta-label"
            >
              {t("pickedUp")}
            </text>
            <rect width="342" height="32" x="24" y="752" fill={LIME} className="phone__cta-fill" rx="8" />
            <g clipPath="url(#phone-cta-clip)">
              <text
                x="195"
                y="773"
                fill={PINE}
                fontSize="15"
                fontWeight="600"
                textAnchor="middle"
                className="phone__cta-label"
              >
                {t("pickedUp")}
              </text>
            </g>
            <g className="phone__cta-chip">
              <rect width="32" height="32" x="334" y="752" fill={LIME} rx="8" />
              <path
                stroke={PINE}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M344 768h12m-5-5 5 5-5 5"
                className="phone__cta-arrow"
              />
            </g>
            <path
              stroke={PINE}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d={check(195, 768)}
              className="phone__cta-mark"
              opacity="0"
            />
          </g>

          <rect width="139" height="5" x="127" y="831" fill="#000" rx="2.5" />
        </g>
      </g>
    </svg>
  );
}
