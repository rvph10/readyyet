"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { buttonClass } from "./button";
import { Icon, type IconName } from "./icon";

export interface MenuItem {
  label: string;
  icon?: IconName;
  // What choosing it means, under the label.
  hint?: string;
  // A heading shown above the first item that names it.
  section?: string;
  onSelect: () => void;
  // Red, for the one item that removes or cancels something.
  danger?: boolean;
  disabled?: boolean;
}

interface Props {
  // The trigger's accessible name, like "More actions for K7Q2".
  label: string;
  items: MenuItem[];
  // What the trigger shows, the three dots by default.
  trigger?: ReactNode;
  // Replaces the round trigger's look, for one that sits in a bar.
  triggerClassName?: string;
  // Shows the label as text with an arrow, what the menu does being its name.
  labelShown?: boolean;
  // For a trigger that opens above, at the bottom of a phone.
  className?: string;
}

// ADR 0059: a trigger and a list of actions under it, as the browser's own
// popover, so Escape and a click outside close it and it shows above
// everything. CSS anchor positioning keeps it under its trigger and flips it
// when there's no room. Arrow keys, Home and End move between items, as
// WAI-ARIA's menu button pattern asks.
export function Menu({ label, items, trigger, triggerClassName, labelShown, className }: Props) {
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
        className={`${triggerClassName ?? buttonClass({ variant: "secondary", size: labelShown ? "md" : "icon" })} ${className ?? ""}`}
      >
        {labelShown ? (
          <>
            {label}
            <Icon name="arrow-down-1" className="size-2.5" />
          </>
        ) : (
          (trigger ?? <Icon name="more-hor" className="size-4" />)
        )}
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
        className="menu-popover w-72 max-w-[calc(100vw-2rem)] rounded-card border border-border-strong bg-surface p-2 text-ink"
      >
        {items.map((item, index) => (
          <div key={item.label}>
            {item.section && item.section !== items[index - 1]?.section && (
              <p
                className={`px-3 pt-2 pb-1 text-label-xs text-muted ${index > 0 ? "mt-2 border-t border-border pt-3" : ""}`}
              >
                {item.section}
              </p>
            )}
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => {
                menu.current!.hidePopover();
                item.onSelect();
              }}
              className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                item.danger
                  ? "text-danger hover:bg-danger-subtle focus-visible:bg-danger-subtle"
                  : "text-ink hover:bg-subtle focus-visible:bg-subtle"
              }`}
            >
              {item.icon && <Icon name={item.icon} className={`size-4 shrink-0 ${item.danger ? "" : "text-muted"}`} />}
              <span className="min-w-0 flex-1">
                <span className="block text-label-sm">{item.label}</span>
                {item.hint && (
                  <span className={`block text-p-xs ${item.danger ? "text-danger" : "text-muted"}`}>{item.hint}</span>
                )}
              </span>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
