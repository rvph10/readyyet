import { useLocale } from "next-intl";

// ADR 0123: each digit is a strip of 0 to 9 that rolls to its place, from 0
// the first time it's drawn and from its old digit when the number changes.
// Digits are keyed by their place from the right, so 128 to 131 rolls only
// the last two. CSS alone moves them, set by data-d, as the CSP refuses a
// style attribute (ADR 0048). Screen readers get the number once, as text.
export function RollingNumber({ value }: { value: number }) {
  const text = new Intl.NumberFormat(useLocale()).format(value);
  const characters = [...text];
  return (
    <span className="rolling-number">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex">
        {characters.map((character, index) => {
          const place = characters.length - index;
          return /\d/.test(character) ? (
            <span key={place} className="rolling-digit">
              <span data-d={character} className="rolling-strip">
                {DIGITS.map((digit) => (
                  <span key={digit}>{digit}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={`${place}${character}`}>{character}</span>
          );
        })}
      </span>
    </span>
  );
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
