const url = process.env.SITE_URL;
if (!url) throw new Error("SITE_URL is not set, see site/.env.example");

export const SITE_URL = url;

// Staging serves the same pages on its own domain, search engines must only
// see production's.
export const INDEXABLE = SITE_URL === "https://readyyet.app";
