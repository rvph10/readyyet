import { readFileSync } from "node:fs";
import path from "node:path";

// The phone's screen: a shop's ReadyYet app, drawn in the 390 by 844 frame of
// the template's screen so hero-scroll.ts plays it the same way. The class
// names are what the timeline drives.

const PINE = "#17423a";
const LIME = "#d6ff53";
const INK = "#1e1e1e";
const GREY = "#565656";
const MINT = "#e2eee9";

// The screen's outline inside the frame, and its status bar, as the template drew them.
const SCREEN =
  "M60.3 654.44c-16.08-.83-25.91-4.54-34.2-12.91a37 37 0 0 1-7.14-9.89c-3.76-7.38-5.14-14.31-5.54-28.02-.14-4.61-.25-113.42-.3-277.22-.08-287.11-.13-271.56 1-278.56.86-5.26 1.95-8.93 3.9-13.05a38 38 0 0 1 8.65-11.95C33.88 15.9 43.05 12.25 56.42 11c4.15-.39 201.12-.57 207.22-.19 8.03.5 13.67 1.65 19.39 3.95 11.88 4.79 20.84 15.46 23.87 28.45 1.54 6.57 1.8 9.7 1.98 24.02.15 12.68.33 226.77.35 431.01.01 90.28-.04 111.04-.3 113.54-.88 8.61-2.18 13.59-5.11 19.51a39.4 39.4 0 0 1-21.84 19.51c-5.32 1.97-10.72 2.96-18.69 3.41-5.04.29-197.64.51-202.99.23M195.35 50.01c5.24-1.61 8.68-5.36 9.56-10.43.3-1.72.29-2.22-.01-3.97a12.7 12.7 0 0 0-7.7-9.77c-2.98-1.17-2.52-1.16-36.17-1.16-27.62 0-31.69.05-33.4.37-6.45 1.22-10.8 6.28-10.8 12.56 0 6.44 4.57 11.63 11.17 12.69.65.1 15.77.17 33.62.15 29.68-.04 32.55-.08 33.73-.44";
const STATUS = readFileSync(path.join(process.cwd(), "src/components/home/hero/hero-phone-status.svg"), "utf8");

type Ticket = Record<"item" | "customer" | "status" | "due" | "step", string>;

export type PhoneText = {
  hello: string;
  shop: string;
  today: string;
  active: string;
  readyCount: string;
  status: string;
  due: string;
  step: string;
  t1: Ticket;
  t2: Ticket;
  t3: Ticket;
  t4: Ticket;
  dueOn: string;
  emailed: string;
  ticket: string;
  emails: string;
  week: string;
  created: string;
  tickets: string;
  days: string[];
  slide: string;
};

const CARDS = [
  { key: "t1", name: "artc", fill: "#fff", ink: INK, icon: PINE, glyph: LIME, edge: "#e1e1e1" },
  { key: "t2", name: "nexaa", fill: LIME, ink: INK, icon: PINE, glyph: LIME, edge: "none" },
  { key: "t3", name: "joy", fill: MINT, ink: INK, icon: PINE, glyph: LIME, edge: "none" },
] as const;

function TagGlyph({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <path
      d={`M${x + 9} ${y + 13}h12l7 7-7 7H${x + 9}z`}
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  );
}

function Head({
  y,
  ticket,
  ink,
  icon,
  glyph,
}: {
  y: number;
  ticket: Ticket;
  ink: string;
  icon: string;
  glyph: string;
}) {
  return (
    <>
      <rect width="40" height="40" x="24" y={y + 8} fill={icon} rx="12" />
      <TagGlyph x={24} y={y + 8} color={glyph} />
      <text x="76" y={y + 25} fill={ink} fontSize="15" fontWeight="600">
        {ticket.item}
      </text>
      <text x="76" y={y + 43} fill={ink} fillOpacity=".55" fontSize="12.5">
        {ticket.customer}
      </text>
    </>
  );
}

function Row({ y, ticket, t, ink }: { y: number; ticket: Ticket; t: PhoneText; ink: string }) {
  return (
    <>
      {[
        [24, t.status, ticket.status],
        [160, t.due, ticket.due],
        [282, t.step, ticket.step],
      ].map(([x, label, value]) => (
        <g key={label}>
          <text x={x} y={y + 150} fill={ink} fillOpacity=".55" fontSize="12">
            {label}
          </text>
          <text x={x} y={y + 172} fill={ink} fontSize="16" fontWeight="600">
            {value}
          </text>
        </g>
      ))}
    </>
  );
}

export function PhoneScreen({ t }: { t: PhoneText }) {
  const bars = [
    [24.0, 33.1],
    [76.667, 44.6],
    [129.334, 28.8],
    [182.001, 53.3],
    [234.668, 39.6],
    [287.335, 61.9],
    [340.002, 72],
  ];
  return (
    <svg fill="none" viewBox="0 0 322.05 665.5" aria-hidden="true">
      <defs>
        <clipPath id="phone-cta-clip">
          <rect width="342" height="32" x="24" y="752" className="phone__cta-clip" rx="8" />
        </clipPath>
        <linearGradient id="phone-huld-grad" x1="195" x2="195" y1="617" y2="811" gradientUnits="userSpaceOnUse">
          <stop stopColor="#123730" />
          <stop offset="1" stopColor={PINE} />
        </linearGradient>
        <clipPath id="phone-amount-clip">
          <rect width="320" height="60" x="35" y="168" />
        </clipPath>
        <clipPath id="phone-caption-clip">
          <rect width="320" height="20" x="35" y="228" />
        </clipPath>
        <radialGradient id="phone-huld-shadow">
          <stop stopColor="#0d0d0d" stopOpacity=".3" />
          <stop offset=".55" stopColor="#0d0d0d" stopOpacity=".12" />
          <stop offset="1" stopColor="#0d0d0d" stopOpacity="0" />
        </radialGradient>
        <clipPath id="phone-rev-label-clip">
          <rect width="390" height="20" y="172" />
        </clipPath>
        <clipPath id="phone-rev-amount-clip">
          <rect width="280" height="52" y="198" />
        </clipPath>
        <clipPath id="phone-screen">
          <path d={SCREEN} />
        </clipPath>
      </defs>
      <g clipPath="url(#phone-screen)">
        <g className="phone__screen" transform="translate(12.6953 10.3438) scale(0.760074 0.763435)">
          <g className="phone__status" dangerouslySetInnerHTML={{ __html: STATUS }} />
          <g className="phone__state phone__state--home">
            <g className="phone__header">
              <g className="phone__header-top">
                <image href="/home/logo.svg" x="20.5" y="76.5" width="47" height="47" />
                <text x="80" y="95" fill={GREY} fontSize="13">
                  {t.hello}
                </text>
                <text x="80" y="115" fill={INK} fontSize="16" fontWeight="600">
                  {t.shop}
                </text>
                <path
                  d="M346 88.5a7.5 7.5 0 0 0-7.5 7.5v4.5l-2 3.5h19l-2-3.5V96a7.5 7.5 0 0 0-7.5-7.5Zm-3 15.5a3 3 0 0 0 6 0"
                  stroke={INK}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
              <g className="phone__header-balance">
                <text x="21" y="180" fill={GREY} fontSize="14">
                  {t.today}
                </text>
                <text x="20" y="232" fill={INK} fontSize="44" fontWeight="500" letterSpacing="-1.5">
                  12
                  <tspan fontSize="22" fill={GREY} letterSpacing="-.3" dx="8">
                    {t.active}
                  </tspan>
                </text>
                <rect width="96" height="30" x="270" y="208" fill={LIME} rx="15" />
                <text x="318" y="228" fill={PINE} fontSize="13" fontWeight="600" textAnchor="middle">
                  {t.readyCount}
                </text>
              </g>
            </g>
            <g className="phone__cards">
              <g className="phone__cards-rest">
                {CARDS.map(({ key, name, fill, ink, icon, glyph, edge }, i) => {
                  const y = 275 + i * 114;
                  return (
                    <g key={key} className={`phone__card phone__card--${name}`}>
                      <rect width="358" height="194" x="16" y={y} fill={fill} rx="20" />
                      <rect width="357" height="193" x="16.5" y={y + 0.5} stroke={edge} rx="19.5" />
                      <Head y={y} ticket={t[key]} ink={ink} icon={icon} glyph={glyph} />
                      <Row y={y} ticket={t[key]} t={t} ink={ink} />
                    </g>
                  );
                })}
              </g>
              <g className="phone__card phone__card--huld">
                <g className="phone__huld-lift">
                  <ellipse
                    cx="195"
                    cy="736"
                    rx="205"
                    ry="131"
                    fill="url(#phone-huld-shadow)"
                    className="phone__huld-shadow"
                    opacity="0"
                  />
                  <rect
                    width="358"
                    height="194"
                    x="16"
                    y="617"
                    fill="url(#phone-huld-grad)"
                    className="phone__huld-bg"
                    rx="20"
                  />
                  <rect
                    width="357"
                    height="193"
                    x="16.5"
                    y="617.5"
                    stroke="#fff"
                    strokeOpacity=".12"
                    className="phone__huld-edge"
                    rx="19.5"
                  />
                  <g className="phone__huld-head">
                    <Head y={617} ticket={t.t4} ink="#fff" icon={LIME} glyph={PINE} />
                  </g>
                  <g className="phone__huld-row">
                    <Row y={617} ticket={t.t4} t={t} ink="#fff" />
                  </g>
                  <g className="phone__huld-detail" opacity="0">
                    <g clipPath="url(#phone-amount-clip)">
                      <g className="phone__huld-amount">
                        <text
                          x="195"
                          y="214"
                          fill="#fff"
                          fontSize="36"
                          fontWeight="500"
                          letterSpacing="-1"
                          textAnchor="middle"
                          className="phone__huld-status"
                        >
                          {t.t4.status}
                        </text>
                        <text
                          x="195"
                          y="214"
                          fill={LIME}
                          fontSize="36"
                          fontWeight="500"
                          letterSpacing="-1"
                          textAnchor="middle"
                          className="phone__huld-ready"
                          opacity="0"
                        >
                          {t.t1.status}
                        </text>
                      </g>
                    </g>
                    <g clipPath="url(#phone-caption-clip)">
                      <text
                        className="phone__huld-caption"
                        x="195"
                        y="243"
                        fill="#fff"
                        fillOpacity=".6"
                        fontSize="13"
                        textAnchor="middle"
                      >
                        {t.dueOn}
                      </text>
                      <text
                        className="phone__huld-emailed"
                        x="195"
                        y="243"
                        fill="#fff"
                        fillOpacity=".6"
                        fontSize="13"
                        textAnchor="middle"
                        opacity="0"
                      >
                        {t.emailed}
                      </text>
                    </g>
                    <g className="phone__huld-arrow">
                      <rect x="44" y="262" width="302" height="8" rx="4" fill="#fff" fillOpacity=".14" />
                      <rect x="44" y="262" width="151" height="8" rx="4" fill={LIME} className="phone__huld-progress" />
                    </g>
                    {[
                      [24, t.ticket, "#128"],
                      [199, t.emails, "2"],
                    ].map(([x, label, value]) => (
                      <g key={x} className="phone__huld-stat">
                        <rect width="167" height="118" x={x} y="295" fill="#fff" fillOpacity=".12" rx="12" />
                        <text x={Number(x) + 8} y="320" fill="#fff" fillOpacity=".6" fontSize="13">
                          {label}
                        </text>
                        <text
                          x={Number(x) + 8}
                          y="401.3"
                          fill="#fff"
                          fontSize="20"
                          letterSpacing="-.5"
                          className="phone__huld-stat-value"
                        >
                          {value}
                        </text>
                      </g>
                    ))}
                  </g>
                </g>
              </g>
            </g>
          </g>
          <g className="phone__state phone__state--detail">
            <g className="phone__detail-top" opacity="0">
              <g className="phone__nav-back">
                <circle cx="44" cy="100" r="23.5" fill="#fff" stroke={INK} strokeOpacity=".08" />
                <path stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m47 92-8 8 8 8" />
              </g>
              <text
                x="195"
                y="106"
                fill={INK}
                fontSize="17"
                fontWeight="600"
                textAnchor="middle"
                className="phone__nav-title"
              >
                {t.week}
              </text>
              <g className="phone__nav-more">
                <circle cx="346" cy="100" r="23.5" fill="#fff" stroke={INK} strokeOpacity=".08" />
                <circle cx="338.5" cy="100" r="2" fill={INK} />
                <circle cx="346" cy="100" r="2" fill={INK} />
                <circle cx="353.5" cy="100" r="2" fill={INK} />
              </g>
              <g clipPath="url(#phone-rev-label-clip)">
                <text x="21" y="186" fill={INK} fillOpacity=".5" fontSize="14" className="phone__rev-label">
                  {t.created}
                </text>
              </g>
              <g clipPath="url(#phone-rev-amount-clip)">
                <text
                  x="20"
                  y="238"
                  fill={INK}
                  fontSize="40"
                  fontWeight="500"
                  letterSpacing="-1"
                  className="phone__rev-amount"
                >
                  <tspan className="phone__rev-value">24</tspan>
                  <tspan className="phone__rev-cents" fontSize="22" fillOpacity=".5" dx="8">
                    {t.tickets}
                  </tspan>
                </text>
              </g>
              <g className="phone__rev-badge">
                <rect width="72" height="26" x="294" y="212" fill={PINE} fillOpacity=".12" rx="13" />
                <path
                  stroke={PINE}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M310 231v-12m-4.5 4.5L310 219l4.5 4.5"
                />
                <text x="320" y="229.5" fill={PINE} fontSize="12.5" fontWeight="600" className="phone__rev-rate">
                  12%
                </text>
              </g>
              <g className="phone__chart">
                {bars.map(([x, h], i) => (
                  <rect
                    key={x}
                    width="26"
                    height={h}
                    x={x}
                    y={334 - h}
                    fill={PINE}
                    fillOpacity={i === 6 ? 1 : 0.15}
                    className="phone__bar"
                    rx="8"
                  />
                ))}
                <circle cx="353" cy="262" r="6" fill={PINE} className="phone__bar-pulse" opacity="0" />
                <text
                  x="353"
                  y="252"
                  fill={PINE}
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                  className="phone__bar-gain"
                  opacity="0"
                >
                  +1
                </text>
                <text
                  x="330"
                  y="250"
                  fill={PINE}
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="end"
                  className="phone__bar-gain2"
                  opacity="0"
                >
                  +1
                </text>
              </g>
              <g fill={INK} fillOpacity=".4" fontSize="11" textAnchor="middle" className="phone__chart-days">
                {t.days.map((day, i) => (
                  <text key={i} x={37 + i * 52.667} y="354">
                    {day}
                  </text>
                ))}
              </g>
            </g>
            <g className="phone__cta" opacity="0">
              <rect width="358" height="48" x="16" y="744" fill={PINE} rx="16" />
              <text
                x="163"
                y="773"
                fill="#fff"
                fontSize="15"
                fontWeight="600"
                textAnchor="middle"
                className="phone__cta-label"
              >
                {t.slide}
              </text>
              <rect width="342" height="32" x="24" y="752" fill={LIME} className="phone__cta-fill" rx="8" />
              <g clipPath="url(#phone-cta-clip)">
                <text
                  x="163"
                  y="773"
                  fill={PINE}
                  fontSize="15"
                  fontWeight="600"
                  textAnchor="middle"
                  className="phone__cta-label"
                >
                  {t.slide}
                </text>
              </g>
              <g className="phone__cta-chip">
                <rect width="32" height="32" x="334" y="752" fill={LIME} rx="8" />
                <g className="phone__cta-arrow">
                  <path
                    fill={PINE}
                    d="M348.46 774q-.47 0-.91-.2a1.8 1.8 0 0 1-1.05-1.59v-8.42a1.8 1.8 0 0 1 1.05-1.59q.55-.25 1.14-.19.6.08 1.07.45l5.1 4.21a1.7 1.7 0 0 1 .64 1.33 1.7 1.7 0 0 1-.64 1.33l-5.1 4.21q-.57.46-1.3.46"
                  />
                </g>
              </g>
              <g className="phone__cta-mark" opacity="0">
                <path
                  d="m185 768 7 7 14-14"
                  stroke={PINE}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </g>
          </g>
          <g className="phone__indicator">
            <rect width="139" height="5" fill="#000" rx="2.5" transform="matrix(-1 0 0 1 266 831)" />
          </g>
        </g>
      </g>
    </svg>
  );
}
