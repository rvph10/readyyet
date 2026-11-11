// The artwork of the four cards, drawn at the size of the template's images
// they replace, so the cards place and animate them the same way.

const PINE = "#17423a";
const LIME = "#d6ff53";
const INK = "#1e1e1e";
const GREY = "#565656";
const LINE = "#e1e1e1";

export type FeatureArtText = Record<
  | "shop"
  | "item"
  | "status"
  | "dropped"
  | "repairing"
  | "ready"
  | "due"
  | "emailReady"
  | "emailLogged"
  | "now"
  | "yesterday"
  | "received"
  | "cleaning"
  | "alteration"
  | "reviewAsk"
  | "reviewCta",
  string
>;

function Check({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size / 24;
  return (
    <path
      d={`M${x - 7 * s} ${y}l${5 * s} ${5 * s} ${10 * s}-${10 * s}`}
      fill="none"
      stroke={color}
      strokeWidth={3 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

// The Customer's tracking page on a phone, cut by the bottom of the card.
export function TrackingPhone({ t, className }: { t: FeatureArtText; className: string }) {
  const steps = [
    { label: t.dropped, state: "done" },
    { label: t.repairing, state: "current" },
    { label: t.ready, state: "next" },
  ] as const;
  return (
    <svg className={className} viewBox="0 0 708 1071" aria-hidden="true">
      <rect x="20" y="20" width="668" height="1100" rx="96" fill={INK} />
      <rect x="44" y="44" width="620" height="1060" rx="74" fill="#fff" />
      <rect x="284" y="68" width="140" height="36" rx="18" fill={INK} />
      <text x="96" y="200" fontSize="30" fontWeight="600" fill={PINE}>
        {t.shop}
      </text>
      <text x="96" y="276" fontSize="52" fontWeight="500" fill={INK}>
        {t.item}
      </text>
      <rect x="96" y="312" width="300" height="64" rx="32" fill={LIME} />
      <text x="246" y="355" textAnchor="middle" fontSize="28" fontWeight="600" fill={PINE}>
        {t.status}
      </text>
      <line x1="130" y1="470" x2="130" y2="750" stroke={LINE} strokeWidth="6" />
      <line x1="130" y1="470" x2="130" y2="610" stroke={PINE} strokeWidth="6" />
      {steps.map(({ label, state }, i) => {
        const y = 470 + i * 140;
        return (
          <g key={label}>
            {state === "done" && (
              <>
                <circle cx="130" cy={y} r="26" fill={PINE} />
                <Check x={130} y={y} size={30} color={LIME} />
              </>
            )}
            {state === "current" && (
              <>
                <circle cx="130" cy={y} r="26" fill="#fff" stroke={PINE} strokeWidth="6" />
                <circle cx="130" cy={y} r="11" fill={PINE} />
              </>
            )}
            {state === "next" && <circle cx="130" cy={y} r="23" fill="#fff" stroke={LINE} strokeWidth="6" />}
            <text
              x="186"
              y={y + 11}
              fontSize="32"
              fontWeight={state === "current" ? 600 : 400}
              fill={state === "next" ? GREY : INK}
            >
              {label}
            </text>
          </g>
        );
      })}
      <rect x="96" y="830" width="516" height="96" rx="28" fill="#f3f3f3" />
      <text x="354" y="890" textAnchor="middle" fontSize="28" fill={GREY}>
        {t.due}
      </text>
    </svg>
  );
}

// Takes the piggy bank's place in the round badge over the phone.
export function QrGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <g fill={PINE}>
        <path d="M6 6h14v14H6zm4 4v6h6v-6zM28 6h14v14H28zm4 4v6h6v-6zM6 28h14v14H6zm4 4v6h6v-6z" fillRule="evenodd" />
        <rect x="28" y="28" width="5" height="5" />
        <rect x="37" y="28" width="5" height="5" />
        <rect x="32.5" y="32.5" width="5" height="5" />
        <rect x="28" y="37" width="5" height="5" />
        <rect x="37" y="37" width="5" height="5" />
      </g>
    </svg>
  );
}

// Two of the emails a Customer gets, the newest on top.
export function EmailStack({ t, className }: { t: FeatureArtText; className: string }) {
  const email = (y: number, title: string, when: string, fresh: boolean) => (
    <g>
      <rect x="8" y={y} width="352" height="128" rx="28" fill="#fff" stroke={fresh ? "none" : LINE} strokeWidth="2" />
      <rect x="30" y={y + 30} width="68" height="68" rx="20" fill={fresh ? PINE : "#f3f3f3"} />
      <path
        d={`M44 ${y + 50}h40v28H44z M44 ${y + 52}l20 15 20-15`}
        fill="none"
        stroke={fresh ? LIME : GREY}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <text x="116" y={y + 58} fontSize="22" fontWeight="600" fill={INK}>
        {title}
      </text>
      <text x="116" y={y + 90} fontSize="18" fill={GREY}>
        {t.shop} · {when}
      </text>
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 368 368" aria-hidden="true">
      <g opacity="0.7">{email(30, t.emailLogged, t.yesterday, false)}</g>
      {email(176, t.emailReady, t.now, true)}
    </svg>
  );
}

// A trade's steps, as the Owner lines them up on Pro.
export function WorkflowList({ t, className }: { t: FeatureArtText; className: string }) {
  const steps = [t.received, t.cleaning, t.alteration, t.ready];
  return (
    <svg className={className} viewBox="0 0 540 523" aria-hidden="true">
      {steps.map((label, i) => {
        const y = 24 + i * 122;
        const lifted = i === 2;
        return (
          <g key={label} transform={lifted ? `translate(-18 0) rotate(-3 270 ${y + 50})` : undefined}>
            <rect x="20" y={y} width="500" height="100" rx="28" fill={lifted ? PINE : "#f3f3f3"} />
            <circle cx="76" cy={y + 50} r="22" fill={lifted ? LIME : "#fff"} />
            <text x="76" y={y + 59} textAnchor="middle" fontSize="24" fontWeight="600" fill={PINE}>
              {i + 1}
            </text>
            <text x="122" y={y + 59} fontSize="28" fontWeight="500" fill={lifted ? "#fff" : INK}>
              {label}
            </text>
            <g fill={lifted ? LIME : "#b9b9b9"}>
              {[0, 1, 2].map((r) =>
                [0, 1].map((c) => <circle key={`${r}${c}`} cx={460 + c * 16} cy={y + 34 + r * 16} r="4.5" />),
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// The email that asks how the visit went.
export function ReviewCard({ t, className }: { t: FeatureArtText; className: string }) {
  const star = (cx: number, cy: number, r: number) => {
    const points = Array.from({ length: 10 }, (_, i) => {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const d = i % 2 === 0 ? r : r * 0.45;
      return `${(cx + d * Math.cos(a)).toFixed(1)},${(cy + d * Math.sin(a)).toFixed(1)}`;
    });
    return (
      <polygon key={cx} points={points.join(" ")} fill={PINE} stroke={PINE} strokeWidth="4" strokeLinejoin="round" />
    );
  };
  return (
    <svg className={className} viewBox="0 0 616 611" aria-hidden="true">
      <rect x="8" y="70" width="600" height="470" rx="40" fill="#fff" />
      <text x="308" y="190" textAnchor="middle" fontSize="30" fontWeight="500" fill={INK}>
        {t.reviewAsk}
      </text>
      {[0, 1, 2, 3, 4].map((i) => star(148 + i * 80, 290, 32))}
      <rect x="148" y="388" width="320" height="84" rx="42" fill={LIME} />
      <text x="308" y="441" textAnchor="middle" fontSize="28" fontWeight="600" fill={PINE}>
        {t.reviewCta}
      </text>
    </svg>
  );
}
