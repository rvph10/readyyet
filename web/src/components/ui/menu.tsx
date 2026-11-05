"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { buttonClass } from "./button";
import { Icon, type IconName } from "./icon";

export interface MenuItem {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  // Red, for the one item that removes or cancels something.
  danger?: boolean;
  disabled?: boolean;
}

interface Props {
  // The trigger's accessible name, like "More actions for K7Q2".
  label: string;
  items: MenuItem[];
  // What the round trigger shows, the three dots by default.
  trigger?: ReactNode;
}

// ADR 0059: a round trigger and a list of actions under it, as the browser's
// own popover, so Escape and a click outside close it and it shows above
// everything. CSS anchor positioning keeps it under its trigger and flips it
// when there's no room. Arrow keys, Home and End move between items, as
// WAI-ARIA's menu button pattern asks.
export function Menu({ label, items, trigger }: Props) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // Each menu needs its own anchor name. Set through the CSSOM, which the
  // CSP allows, where a style attribute would be refused (ADR 0048).
  useEffect(() => {
    const name = `--menu-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
    button.current!.style.setProperty("anchor-name", name);
    menu.current!.style.setProperty("position-anchor", name);
  }, [id]);

  function focusItem(index: number) {
    const enabled = [...menu.current!.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)")];
    enabled.at(index % enabled.length)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = [...menu.current!.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)")];
    const current = enabled.indexOf(document.activeElement as HTMLButtonElement);
    const moves: Record<string, number> = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: -1 };
    if (event.key in moves) {
      event.preventDefault();
      focusItem(moves[event.key]);
    }
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        popoverTarget={id}
        aria-label={label}
        aria-haspopup="menu"
        className={buttonClass({ variant: "secondary", size: "icon" })}
      >
        {trigger ?? <Icon name="more-hor" className="size-4" />}
      </button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        onToggle={(event) => {
          if (event.newState === "open") focusItem(0);
        }}
        onKeyDown={onKeyDown}
        className="menu-popover min-w-48 rounded-xl border border-border bg-surface p-1 text-ink shadow-float"
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={item.disabled}
            onClick={() => {
              menu.current!.hidePopover();
              item.onSelect();
            }}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-label-sm transition-colors outline-none focus-visible:bg-subtle disabled:cursor-not-allowed disabled:text-muted/60 ${
              item.danger
                ? "text-danger hover:bg-danger-subtle focus-visible:bg-danger-subtle"
                : "text-muted hover:bg-subtle hover:text-ink focus-visible:text-ink"
            }`}
          >
            {item.icon && <Icon name={item.icon} className="size-3.5 shrink-0" />}
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
