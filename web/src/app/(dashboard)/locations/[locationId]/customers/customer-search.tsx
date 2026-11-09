"use client";

import { useTranslations } from "next-intl";
import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPhone } from "@/components/phone-number";
import { Avatar } from "@/components/ui/avatar";
import { SearchField } from "@/components/ui/search-field";
import type { Sort } from "@/lib/sort";
import { useCustomerLookup } from "../new-ticket/use-customer-lookup";
import { customersHref, type CustomerSort } from "./customer-views";

const SEARCH_FROM_LETTERS = 2;

interface Props {
  locationId: string;
  action: string;
  query: string;
  sort: Sort<CustomerSort> | null;
}

// Finds someone while typing and opens them in one click. Enter lists every
// match, in the URL like the Tickets page's search. Emptying the box leaves the
// search, as there's nothing left to press Enter for.
export function CustomerSearch({ locationId, action, query, sort }: Props) {
  const t = useTranslations("customers");
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [open, setOpen] = useState(false);
  const typed = value.trim();
  const lookingUp = open && typed !== query && typed.length >= SEARCH_FROM_LETTERS;
  const matches = useCustomerLookup(locationId, lookingUp ? typed : "");

  return (
    <div
      className="relative w-full md:w-96"
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Form action={action} role="search">
        {sort && (
          <>
            <input type="hidden" name="sort" value={sort.column} />
            <input type="hidden" name="dir" value={sort.dir} />
          </>
        )}
        <SearchField
          name="q"
          label={t("search")}
          placeholder={t("search")}
          autoComplete="off"
          maxLength={100}
          value={value}
          onChange={(next) => {
            setValue(next);
            if (!next && query) router.replace(customersHref(locationId, { sort }));
          }}
        />
      </Form>
      {matches.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 rounded-card border border-border-strong bg-surface p-1.5">
          {matches.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`${action}/${customer.id}`}
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-subtle"
              >
                <Avatar id={customer.fullName} name={customer.fullName} src={null} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label-sm">{customer.fullName}</span>
                  <span className="block truncate text-p-xs text-muted">
                    {customer.email ?? (customer.phone ? formatPhone(customer.phone) : t("noContact"))}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
