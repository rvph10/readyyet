import type { StaticImageData } from "next/image";
import icon from "@/app/icon.svg";

// Next.js types *.svg imports as any, in case an SVGR plugin turns them into
// components. Without one they are plain static images.
const image = icon as StaticImageData;

// Decorative, what's around it names ReadyYet or the Business. A vector, so
// next/image has nothing to add, and its style attribute is refused by the
// Content-Security-Policy.
export function Logo({ className }: { className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image.src} alt="" width={80} height={80} className={className} />;
}
