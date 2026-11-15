import { useCallback, useEffect, useState, type RefObject } from "react";

// Call it when a form refuses a submit: once its errors are on screen, the
// first field marked invalid takes focus, scrolled into view, and a screen
// reader reads its label with its error (describedBy in field.tsx). Not on
// every change of the errors, so clearing one while typing doesn't move focus.
export function useFocusFirstError(form: RefObject<HTMLFormElement | null>) {
  const [refusals, setRefusals] = useState(0);
  useEffect(() => {
    if (refusals > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [form, refusals]);
  return useCallback(() => setRefusals((count) => count + 1), []);
}
