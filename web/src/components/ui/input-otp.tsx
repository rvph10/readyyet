"use client";

import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";

interface Props {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  // input-otp adds a <style> of its own, which the CSP only runs with it.
  nonce?: string;
  "aria-label": string;
}

// shadcn/ui's InputOTP (ADR 0043, ADR 0047): one input drawn as a box per
// digit, so pasting and the phone's code suggestion fill every box.
export function InputOtp({ length, ...props }: Props) {
  return (
    <OTPInput
      maxLength={length}
      pattern={REGEXP_ONLY_DIGITS}
      autoComplete="one-time-code"
      autoFocus
      containerClassName="flex gap-2"
      render={({ slots }) => (
        <>
          {slots.map((slot, index) => (
            <Slot key={index} {...slot} />
          ))}
        </>
      )}
      {...props}
    />
  );
}

function Slot({ char, isActive, hasFakeCaret }: SlotProps) {
  return (
    <div
      className={`relative flex size-12 items-center justify-center rounded border bg-surface font-mono text-xl ${
        isActive ? "border-ink ring-2 ring-brand" : "border-border"
      }`}
    >
      {char}
      {hasFakeCaret && <div className="h-6 w-px animate-pulse bg-ink" />}
    </div>
  );
}
