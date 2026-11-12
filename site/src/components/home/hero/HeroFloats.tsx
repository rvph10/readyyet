import { getTranslations } from "next-intl/server";

const INK = "#1e1e1e";
const SOFT = "#565656";
const PINE = "#17423a";
const LIME = "#d6ff53";

const star = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const d = i % 2 ? r * 0.45 : r;
    return `${(cx + d * Math.cos(angle)).toFixed(2)},${(cy + d * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");

// What reaches the Customer while the phone plays: the email asking to approve
// a quote, a photo the Location adds, the email saying it's ready, and the
// review after pickup. ReadyYet keeps no quote amounts (ADR 0007), so none shows.
export async function HeroFloats() {
  const t = await getTranslations("home.hero.phone");

  return (
    <div className="hero__floats" aria-hidden="true">
      <div className="hero__float hero__float--quote">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 72" fill="none">
          <rect width="44" height="44" x="14" y="14" fill={LIME} rx="12" />
          <rect width="20" height="15" x="26" y="28.5" stroke={PINE} strokeWidth="2" rx="2.5" />
          <path stroke={PINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m27 30 9 7 9-7" />
          <text x="70" y="32" fill={INK} fontSize="15" fontWeight="600">
            {t("quoteTitle")}
          </text>
          <text x="70" y="51" fill={SOFT} fontSize="12.5">
            {t("quoteText")}
          </text>
        </svg>
      </div>
      <div className="hero__float hero__float--photo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 72" fill="none">
          <rect width="44" height="44" x="14" y="14" fill={LIME} rx="12" />
          <rect width="22" height="16" x="25" y="29" stroke={PINE} strokeWidth="2" rx="3" />
          <circle cx="36" cy="37" r="4" stroke={PINE} strokeWidth="2" />
          <path stroke={PINE} strokeLinejoin="round" strokeWidth="2" d="m31 29 2-3h6l2 3" />
          <text x="70" y="32" fill="#fff" fontSize="15" fontWeight="600">
            {t("photoTitle")}
          </text>
          <text x="70" y="51" fill={LIME} fontSize="12.5">
            {t("photoText")}
          </text>
        </svg>
      </div>
      <div className="hero__float hero__float--ready">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 72" fill="none">
          <g className="float__ready">
            <rect width="44" height="44" x="14" y="14" fill={PINE} rx="12" />
            <path
              stroke={LIME}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.6"
              d="m27.5 36.5 5.5 5.5L45 30"
            />
            <text x="70" y="32" fill={INK} fontSize="15" fontWeight="600">
              {t("readyTitle")}
            </text>
            <text x="70" y="51" fill={SOFT} fontSize="12.5">
              {t("readyText")}
            </text>
          </g>
          <g className="float__done" opacity="0">
            <rect width="44" height="44" x="14" y="14" fill={LIME} rx="12" />
            <polygon points={star(36, 36.5, 10)} fill={PINE} />
            <text x="70" y="32" fill={INK} fontSize="15" fontWeight="600">
              {t("reviewTitle")}
            </text>
            {[0, 1, 2, 3, 4].map((i) => (
              <polygon key={i} points={star(226 + i * 15, 27, 6.5)} fill={PINE} />
            ))}
            <text x="70" y="51" fill={SOFT} fontSize="12.5">
              {t("reviewText")}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
