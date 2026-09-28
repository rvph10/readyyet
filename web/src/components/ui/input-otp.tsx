"use client";

import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";
import { useId } from "react";
import { Icon } from "./icon";

interface Props {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  // input-otp adds a <style> of its own, which the CSP only runs with it.
  nonce?: string;
  "aria-label": string;
  // A refused code, shown under the boxes like a field's error (ADR 0057).
  error?: string | null;
}

// shadcn/ui's InputOTP (ADR 0043, ADR 0047): one input drawn as a box per
// digit, so pasting and the phone's code suggestion fill every box.
export function InputOtp({ length, error, ...props }: Props) {
  const errorId = useId();
  return (
    <div>
      <OTPInput
        maxLength={length}
        pattern={REGEXP_ONLY_DIGITS}
        autoComplete="one-time-code"
        autoFocus
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        containerClassName="flex w-full gap-2"
        render={({ slots }) => (
          <>
            {slots.map((slot, index) => (
              <Slot key={index} {...slot} invalid={Boolean(error)} />
            ))}
          </>
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 flex gap-1.5 text-p-sm text-red-700">
          <Icon name="info-triangle" className="mt-1 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function Slot({ char, isActive, hasFakeCaret, invalid }: SlotProps & { invalid: boolean }) {
  const border = invalid
    ? `border-red-700 ${isActive ? "ring-3 ring-red-700/15" : ""}`
    : isActive
      ? "border-ink ring-3 ring-ink/10"
      : "border-border";
  return (
    <div
      className={`relative flex h-16 flex-1 items-center justify-center rounded-xl border bg-surface text-title-h5 transition-colors ${border}`}
    >
      {char}
      {hasFakeCaret && <div className="h-6 w-px animate-pulse bg-ink" />}
    </div>
  );
}
