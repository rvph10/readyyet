import type { HTMLAttributes } from "react";

const paddings = { none: "", md: "p-5", lg: "p-6" };

interface Props extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "aside" | "article";
  padding?: keyof typeof paddings;
}

// ADR 0049 and 0059: the white layer that sits on the grey canvas, barely
// lifted. className is for placing it, like its width or a flex column.
export function Panel({ as: Tag = "div", padding = "md", className, ...props }: Props) {
  return <Tag {...props} className={`rounded-3xl bg-surface shadow-panel ${paddings[padding]} ${className ?? ""}`} />;
}
