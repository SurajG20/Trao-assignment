"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    api
      .me()
      .then(() => router.replace("/kits"))
      .catch(() => router.replace("/login"));
  }, [router]);
  return (
    <main id="main" className="grid min-h-screen place-items-center text-zinc-500">
      Loading…
    </main>
  );
}
