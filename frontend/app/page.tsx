"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { HomePageSkeleton } from "@/components/skeletons/PageSkeletons";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    api
      .me()
      .then(() => router.replace("/kits"))
      .catch(() => router.replace("/login"));
  }, [router]);
  return <HomePageSkeleton />;
}
