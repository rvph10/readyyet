/* eslint-disable @next/next/no-img-element -- Already resized when uploaded (ADR 0026), so next/image has nothing to add, and its style attribute is refused by the Content-Security-Policy. */
"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";

interface Photo {
  url: string;
  alt: string;
  caption: string;
}

// However many there are, up to 5 (ADR 0026), they fill the panel's width
// rather than leave a gap at the end of a row. On a phone, four are two rows
// and five are two above three, where one row would make them too small.
const LAYOUTS: Record<number, { grid: string; span: (index: number) => string; shape: (index: number) => string }> = {
  1: { grid: "grid-cols-1", span: () => "", shape: () => "aspect-video" },
  2: { grid: "grid-cols-2", span: () => "", shape: () => "aspect-4/3" },
  3: { grid: "grid-cols-3", span: () => "", shape: () => "aspect-4/3" },
  4: { grid: "grid-cols-2 lg:grid-cols-4", span: () => "", shape: () => "aspect-video lg:aspect-square" },
  5: {
    grid: "grid-cols-6 lg:grid-cols-5",
    span: (index) => (index < 2 ? "col-span-3 lg:col-span-1" : "col-span-2 lg:col-span-1"),
    shape: (index) => (index < 2 ? "aspect-video lg:aspect-square" : "aspect-square"),
  },
};

// Of any shape, cropped to fit, and the whole picture opens over the page,
// where the image is already loaded, rather than at a presigned URL that stops
// working after 15 minutes.
export function Photos({ photos }: { photos: Photo[] }) {
  const [opened, setOpened] = useState<Photo | null>(null);
  const { grid, span, shape } = LAYOUTS[photos.length];
  return (
    <>
      <ul className={`grid gap-2 ${grid}`}>
        {photos.map((photo, index) => (
          <li key={photo.url} className={span(index)}>
            <button
              type="button"
              onClick={() => setOpened(photo)}
              className={`block w-full cursor-zoom-in overflow-hidden rounded-xl bg-subtle transition hover:brightness-90 ${shape(index)}`}
            >
              <img src={photo.url} alt={photo.alt} loading="lazy" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      {opened && (
        <Dialog
          open
          variant="image"
          title={opened.caption}
          onClose={() => setOpened(null)}
          media={
            <img
              src={opened.url}
              alt={opened.alt}
              className="mx-auto max-h-[80dvh] w-auto rounded-2xl object-contain"
            />
          }
        />
      )}
    </>
  );
}
