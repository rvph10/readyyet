import "server-only";
import { cache } from "react";
import { api } from "./api/client";
import { pageData } from "./api/errors";

// Read by the dashboard layout and its pages, called once per request.
export const getMe = cache(async () => pageData(await (await api()).GET("/me")));
