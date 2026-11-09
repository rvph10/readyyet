// Heights and widths go through the CSSOM, which the CSP allows (ADR 0048):
// a style attribute would be refused. Used as a ref.
export function sized(property: "height" | "width", percent: number) {
  return (element: HTMLElement | null) => {
    if (element) element.style[property] = `${percent}%`;
  };
}
