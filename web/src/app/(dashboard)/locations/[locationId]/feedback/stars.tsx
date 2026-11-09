import { useTranslations } from "next-intl";

// A rating read at a glance: solid stars for what was given, faint for the rest.
export function Stars({ value, className }: { value: number; className?: string }) {
  const t = useTranslations("feedback");
  return (
    <span
      role="img"
      aria-label={t("starsLabel", { stars: value })}
      className={`inline-flex leading-none ${className ?? ""}`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} aria-hidden="true" className={star <= value ? "" : "opacity-25"}>
          ★
        </span>
      ))}
    </span>
  );
}
