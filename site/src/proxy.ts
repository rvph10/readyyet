import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Sends / to the visitor's language, /en, /fr or /nl, from Accept-Language.
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!_next|_vercel|.*\\..*).*)",
};
