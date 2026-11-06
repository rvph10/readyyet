import qrcode from "qrcode-generator";

const QUIET_MODULES = 4;

// Drawn here rather than by a QR service, as the link is the only key to a
// Customer's Ticket (ADR 0004). Always dark on white: scanners need the contrast.
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const code = qrcode(0, "M");
  code.addData(value);
  code.make();
  const size = code.getModuleCount();
  let path = "";
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (code.isDark(row, column)) path += `M${column} ${row}h1v1h-1z`;
    }
  }
  const box = size + QUIET_MODULES * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-QUIET_MODULES} ${-QUIET_MODULES} ${box} ${box}`}
      shapeRendering="crispEdges"
      className={`rounded-2xl border border-border bg-white text-black ${className ?? ""}`}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
