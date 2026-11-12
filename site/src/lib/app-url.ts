const url = process.env.NEXT_PUBLIC_APP_URL;
if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set, see site/.env.example");

export const APP_URL = url;
