"use client";

import { formatPhoneNumberIntl } from "react-phone-number-input";

// "+32 471 31 89 44" to read, stored as "+32471318944". What it can't parse
// stays as stored.
export function formatPhone(phone: string) {
  return formatPhoneNumberIntl(phone) || phone;
}

// A client component as the library's entry point only loads in one.
export function PhoneNumber({ value }: { value: string }) {
  return formatPhone(value);
}
