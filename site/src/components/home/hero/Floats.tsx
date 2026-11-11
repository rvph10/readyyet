// The notes that float around the phone: what the shop's actions send its
// Customers. Drawn in the template's 300 by 72 frame, the class names are
// what hero-scroll.ts drives.

const PINE = "#17423a";
const LIME = "#d6ff53";
const INK = "#1e1e1e";

export type FloatText = Record<
  "createdTitle" | "createdText" | "qrTitle" | "qrText" | "readyTitle" | "readyText" | "doneText",
  string
>;

function Check({ color }: { color: string }) {
  return (
    <path stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" d="m27.5 36.5 5.5 5.5L45 30" />
  );
}

export function Floats({ t }: { t: FloatText }) {
  return (
    <div className="hero__floats" aria-hidden="true">
      <div className="hero__float hero__float--payment">
        <svg viewBox="0 0 300 72" fill="none">
          <rect width="44" height="44" x="14" y="14" fill={PINE} fillOpacity=".12" rx="12" />
          <path stroke={PINE} strokeLinecap="round" strokeWidth="2.6" d="M36 27v18M27 36h18" />
          <text x="70" y="32" fill={INK} fontSize="15" fontWeight="600">
            {t.createdTitle}
          </text>
          <text x="70" y="51" fill={INK} fillOpacity=".55" fontSize="12.5">
            {t.createdText}
          </text>
        </svg>
      </div>
      <div className="hero__float hero__float--tap">
        <svg viewBox="0 0 300 72" fill="none">
          <rect width="44" height="44" x="14" y="14" fill={LIME} rx="12" />
          <path
            fill={PINE}
            fillRule="evenodd"
            d="M24 24h9v9h-9zm3 3v3h3v-3zM39 24h9v9h-9zm3 3v3h3v-3zM24 39h9v9h-9zm3 3v3h3v-3zM39 39h3v3h-3zm6 0h3v3h-3zm-3 3h3v3h-3zm-3 3h3v3h-3zm6 0h3v3h-3z"
          />
          <text x="70" y="32" fill="#fff" fontSize="15" fontWeight="600">
            {t.qrTitle}
          </text>
          <text x="70" y="51" fill="#fff" fillOpacity=".6" fontSize="12.5">
            {t.qrText}
          </text>
        </svg>
      </div>
      <div className="hero__float hero__float--invoice">
        <svg viewBox="0 0 300 72" fill="none">
          <g className="float__ready">
            <rect width="44" height="44" x="14" y="14" fill={INK} fillOpacity=".06" rx="12" />
            <path stroke={INK} strokeLinejoin="round" strokeWidth="2" d="M26 27h20v18H26z" />
            <path stroke={INK} strokeLinejoin="round" strokeWidth="2" d="m26 28 10 8 10-8" />
            <text x="70" y="51" fill={INK} fillOpacity=".55" fontSize="12.5">
              {t.readyText}
            </text>
          </g>
          <g className="float__done" opacity="0">
            <rect width="44" height="44" x="14" y="14" fill={LIME} rx="12" />
            <Check color={PINE} />
            <text x="70" y="51" fill={PINE} fontSize="12.5" fontWeight="600">
              {t.doneText}
            </text>
          </g>
          <text x="70" y="32" fill={INK} fontSize="15" fontWeight="600">
            {t.readyTitle}
          </text>
          <text x="286" y="32" fill={INK} fillOpacity=".55" fontSize="13" textAnchor="end">
            #128
          </text>
        </svg>
      </div>
    </div>
  );
}
