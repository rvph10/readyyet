// The artwork of the three steps, drawn at the size of the template's
// screenshots they replace, so the panels crop and move them the same way.

const PINE = "#17423a";
const LIME = "#d6ff53";
const INK = "#1e1e1e";
const GREY = "#565656";

export type ArtText = Record<
  | "customer"
  | "qr"
  | "item"
  | "due"
  | "create"
  | "yourItem"
  | "dropped"
  | "diagnosis"
  | "repairing"
  | "ready"
  | "scan"
  | "ticket"
  | "inProgress"
  | "readyAt"
  | "readyTitle"
  | "emailSent",
  string
>;

function Card({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  return (
    <svg className="img step-art" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {children}
    </svg>
  );
}

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

export function CustomerRow({ t }: { t: ArtText }) {
  return (
    <Card width={528} height={140}>
      <rect width="528" height="140" rx="28" fill="#fff" />
      <circle cx="70" cy="70" r="46" fill={LIME} />
      <text x="70" y="81" textAnchor="middle" fontSize="30" fontWeight="600" fill={PINE}>
        SP
      </text>
      <text x="136" y="64" fontSize="30" fontWeight="500" fill={INK}>
        Sofie Peeters
      </text>
      <text x="136" y="100" fontSize="22" fill={GREY}>
        {t.customer}
      </text>
      <rect x="372" y="42" width="132" height="56" rx="28" fill="none" stroke={PINE} strokeWidth="2.5" />
      <text x="438" y="77" textAnchor="middle" fontSize="20" fontWeight="600" fill={PINE}>
        {t.qr}
      </text>
    </Card>
  );
}

export function ItemRow({ t }: { t: ArtText }) {
  return (
    <Card width={596} height={158}>
      <rect width="596" height="158" rx="28" fill="#fff" />
      <rect x="24" y="31" width="96" height="96" rx="24" fill={PINE} />
      <path d="M50 62h26l18 17-18 17H50z" fill={LIME} />
      <circle cx="61" cy="79" r="4.5" fill={PINE} />
      <text x="140" y="72" fontSize="32" fontWeight="500" fill={INK}>
        {t.item}
      </text>
      <text x="140" y="110" fontSize="22" fill={GREY}>
        {t.due}
      </text>
      <rect x="418" y="47" width="154" height="64" rx="32" fill={PINE} />
      <text x="495" y="86" textAnchor="middle" fontSize="22" fontWeight="600" fill="#fff">
        {t.create}
      </text>
      <path d="M538 96v36l9-8 6 14 7-3-6-13h12z" fill={INK} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
    </Card>
  );
}

export function TrackingCard({ t }: { t: ArtText }) {
  const steps = [
    { label: t.dropped, state: "done" },
    { label: t.diagnosis, state: "done" },
    { label: t.repairing, state: "current" },
    { label: t.ready, state: "next" },
  ] as const;
  return (
    <Card width={356} height={450}>
      <rect width="356" height="450" rx="36" fill={PINE} />
      <text x="32" y="62" fontSize="20" fontWeight="600" fill={LIME}>
        {t.yourItem}
      </text>
      <text x="32" y="108" fontSize="34" fontWeight="500" fill="#fff">
        {t.repairing}
      </text>
      <line x1="46" y1="190" x2="46" y2="370" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" />
      <line x1="46" y1="190" x2="46" y2="310" stroke={LIME} strokeWidth="3" />
      {steps.map(({ label, state }, i) => {
        const y = 190 + i * 60;
        return (
          <g key={label}>
            {state === "done" && (
              <>
                <circle cx="46" cy={y} r="13" fill={LIME} />
                <Check x={46} y={y} size={16} color={PINE} />
              </>
            )}
            {state === "current" && (
              <>
                <circle cx="46" cy={y} r="13" fill={PINE} stroke={LIME} strokeWidth="3" />
                <circle cx="46" cy={y} r="5" fill={LIME} />
              </>
            )}
            {state === "next" && (
              <circle cx="46" cy={y} r="12" fill={PINE} stroke="#fff" strokeOpacity="0.4" strokeWidth="3" />
            )}
            <text
              x="76"
              y={y + 7}
              fontSize="20"
              fontWeight={state === "current" ? 600 : 400}
              fill="#fff"
              fillOpacity={state === "next" ? 0.55 : 1}
            >
              {label}
            </text>
          </g>
        );
      })}
    </Card>
  );
}

// A fixed pattern that reads as a QR code at a glance; it encodes nothing.
const QR_SIZE = 21;
const qrModules = (() => {
  const finder = (r: number, c: number) =>
    [
      [0, 0],
      [0, QR_SIZE - 7],
      [QR_SIZE - 7, 0],
    ].some(([fr, fc]) => {
      const y = r - fr;
      const x = c - fc;
      if (x < 0 || y < 0 || x > 6 || y > 6) return false;
      return x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
    });
  const inFinderZone = (r: number, c: number) =>
    (r < 8 && c < 8) || (r < 8 && c >= QR_SIZE - 8) || (r >= QR_SIZE - 8 && c < 8);
  let seed = 128;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const cells: [number, number][] = [];
  for (let r = 0; r < QR_SIZE; r++)
    for (let c = 0; c < QR_SIZE; c++) {
      const on = inFinderZone(r, c) ? finder(r, c) : next() < 0.48;
      if (on) cells.push([r, c]);
    }
  return cells;
})();

export function QrCard({ t }: { t: ArtText }) {
  const cell = 220 / QR_SIZE;
  return (
    <Card width={356} height={450}>
      <rect width="356" height="450" rx="36" fill="#fff" />
      <g fill={PINE}>
        {qrModules.map(([r, c]) => (
          <rect key={`${r}-${c}`} x={68 + c * cell} y={52 + r * cell} width={cell + 0.4} height={cell + 0.4} />
        ))}
      </g>
      <text x="178" y="334" textAnchor="middle" fontSize="24" fontWeight="500" fill={INK}>
        {t.scan}
      </text>
      <text x="178" y="370" textAnchor="middle" fontSize="20" fill={GREY}>
        {t.ticket}
      </text>
    </Card>
  );
}

export function ReadyTrack({ t }: { t: ArtText }) {
  return (
    <Card width={341} height={273}>
      <rect width="341" height="273" rx="28" fill="#fff" />
      <text x="28" y="54" fontSize="20" fill={INK}>
        {t.inProgress}
      </text>
      <rect x="170" y="22" width="147" height="48" rx="24" fill={PINE} />
      <text x="243.5" y="53" textAnchor="middle" fontSize="20" fontWeight="600" fill="#fff">
        {t.ready}
      </text>
      <line x1="24" y1="94" x2="317" y2="94" stroke="#e1e1e1" strokeWidth="3" />
      <line x1="44" y1="160" x2="282" y2="160" stroke={PINE} strokeWidth="4" />
      {[44, 120, 196].map((cx) => (
        <circle key={cx} cx={cx} cy="160" r="11" fill={PINE} />
      ))}
      <circle cx="282" cy="160" r="22" fill={LIME} />
      <Check x={282} y={160} size={22} color={PINE} />
      <text x="28" y="232" fontSize="20" fill={GREY}>
        {t.readyAt}
      </text>
    </Card>
  );
}

export function ReadyEmail({ t }: { t: ArtText }) {
  return (
    <Card width={298} height={286}>
      <rect x="4" y="4" width="290" height="278" rx="34" fill="#fff" stroke="#e2eee9" strokeWidth="8" />
      <circle cx="74" cy="84" r="40" fill={LIME} />
      <Check x={74} y={84} size={30} color={PINE} />
      <text x="34" y="182" fontSize="30" fontWeight="500" fill={INK}>
        {t.readyTitle}
      </text>
      <text x="34" y="224" fontSize="20" fill={GREY}>
        {t.emailSent}
      </text>
    </Card>
  );
}
