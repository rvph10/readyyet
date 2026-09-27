import type { ReactNode } from "react";

export default function SignInLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">{children}</main>;
}
