import type { HTMLAttributes } from "react";

const paddings = { none: "", md: "p-5", lg: "p-6" };

interface Props extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "aside" | "article";
  padding?: keyof typeof paddings;
}

// ADR 0087: the white layer on the canvas, flat, with a hairline edge. className is for placing it, like its width or a flex column.
export function Panel({ as: Tag = "div", padding = "md", className, ...props }: Props) {
  return (
    <Tag
      {...props}
      className={`rounded-sheet border border-border bg-surface ${paddings[padding]} ${className ?? ""}`}
    />
  );
}
