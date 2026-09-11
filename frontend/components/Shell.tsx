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
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-2 text-sm">
            {email && (
              <span className="hidden max-w-40 truncate text-muted-foreground sm:inline">
                {email}
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <div id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </div>
    </div>
  );
}
