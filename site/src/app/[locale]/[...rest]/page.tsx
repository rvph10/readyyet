import { notFound } from "next/navigation";

// Any path no page matches, under a language, gets that language's not-found
// page instead of the bare one Next.js serves outside the layout.
export default function Page() {
  notFound();
}
