"use client";

import Image from "next/image";
import { useState } from "react";
import { initials } from "./ui/avatar";

const sizes = {
  md: { box: "size-10 rounded-xl text-label-md", pixels: 40 },
  lg: { box: "size-18 rounded-2xl text-label-xl", pixels: 72 },
};

// A Business's logo, shown for all its Locations (ADR 0051), or its initials
// in lime on ink without one, or when the logo can't be loaded (ADR 0064).
export function BusinessAvatar({
  name,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  logoUrl: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const { box, pixels } = sizes[size];

  if (logoUrl && !failed) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden border border-border bg-surface ${box} ${className ?? ""}`}
      >
        {/* Served by the API, already resized when uploaded (ADR 0026). */}
        <Image
          src={logoUrl}
          alt={name}
          width={pixels}
          height={pixels}
          unoptimized
          onError={() => setFailed(true)}
          className="size-full object-contain p-1.5"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-ink text-brand ${box} ${className ?? ""}`}
    >
      {initials(name)}
    </span>
  );
}
