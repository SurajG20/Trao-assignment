"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function Shell({
  email,
  children,
}: {
  email?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  async function logout() {
    await api.logout().catch(() => undefined);
    router.push("/login");
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/kits" className="font-semibold tracking-tight">
            Interview Prep Kit
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link className="hover:underline" href="/kits">
              Kits
            </Link>
            <Link className="hover:underline" href="/kits/new">
              New kit
            </Link>
            {email && <span className="hidden text-zinc-500 sm:inline">{email}</span>}
            <button type="button" className="text-teal-800 hover:underline" onClick={logout}>
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <div id="main" className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </div>
    </div>
  );
}
