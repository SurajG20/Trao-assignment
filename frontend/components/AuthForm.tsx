"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { Brand } from "@/components/Brand";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (isLogin) await api.login(email, password);
      else await api.register(email, password);
      router.push("/kits");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isLogin
            ? "Could not sign in"
            : "Could not create account",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main id="main" className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[minmax(0,22rem)_1fr]">
      <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:py-12">
        <Brand href="/login" />
        <form onSubmit={onSubmit} className="max-w-sm py-12">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {isLogin ? "Sign in" : "Create an account"}
          </h1>
          <p className="mt-2 max-w-[36ch] text-muted-foreground">
            {isLogin
              ? "Open kits saved to this email."
              : "Use an email and a password of at least 8 characters."}
          </p>
          <div className="mt-8 grid gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{isLogin ? "Could not sign in" : "Could not create account"}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending
                ? isLogin
                  ? "Signing in…"
                  : "Creating account…"
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Need an account?{" "}
                <Link href="/register" className="text-foreground underline underline-offset-4">
                  Create one
                </Link>
              </>
            ) : (
              <>
                Already registered?{" "}
                <Link href="/login" className="text-foreground underline underline-offset-4">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </form>
        <p className="text-sm text-muted-foreground">Trao engineering assessment</p>
      </section>

      <section
        aria-hidden="true"
        className="hidden min-h-full items-stretch p-6 lg:flex lg:p-10"
      >
        <div className="grid min-h-[32rem] w-full flex-1 grid-cols-2 overflow-hidden rounded-lg">
          <div className="flex flex-col justify-between bg-primary p-8 text-primary-foreground">
            <p className="font-display text-sm italic text-primary-foreground/70">They ask</p>
            <p className="font-display text-3xl font-medium leading-snug">
              Why this company, and why this role, in the next five days?
            </p>
            <p className="text-sm text-primary-foreground/70">Paste a posting. We write the brief.</p>
          </div>
          <div className="flex flex-col justify-between bg-card p-8 ring-1 ring-border">
            <p className="font-display text-sm italic text-muted-foreground">You answer</p>
            <p className="max-w-[38ch] text-lg leading-relaxed">
              Company pages, the job text, and a schedule you can actually finish before you sit down.
            </p>
            <p className="text-sm text-muted-foreground">Flashcards and a day-by-day plan.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
