import type { z } from "zod";

// A form's schema is shaped like the API's request body, so an issue's path
// is the field name the API uses, and the form's error lands where the
// API's would. The first issue of each field is the one shown.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    errors[issue.path.join(".")] ??= issue.message;
  }
  return errors;
}
