"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";

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
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-3 text-sm">
            {email && (
              <span className="hidden max-w-48 truncate text-muted-foreground sm:inline">
                {email}
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <div id="main" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {children}
      </div>
    </div>
  );
}
