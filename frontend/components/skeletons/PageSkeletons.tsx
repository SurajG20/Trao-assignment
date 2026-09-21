import { Shell } from "@/components/Shell";
import { Skeleton } from "@/components/ui/skeleton";

export function HomePageSkeleton() {
  return (
    <main id="main" className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-xs space-y-3">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3 mx-auto" />
      </div>
    </main>
  );
}

export function KitsPageSkeleton() {
  return (
    <Shell>
      <div className="flex items-end justify-between gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
      <ul className="mt-8 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="panel p-5">
            <Skeleton className="h-6 w-2/3 max-w-sm" />
            <Skeleton className="mt-2 h-4 w-48" />
            <Skeleton className="mt-3 h-5 w-16" />
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export function KitDetailSkeleton() {
  const tabs = ["Brief", "Role", "Questions", "Flashcards", "Schedule"];

  return (
    <Shell>
      <Skeleton className="h-4 w-16" />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-10 w-3/4 max-w-md" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      <div className="mt-8 flex gap-6 border-b border-border pb-3 sm:gap-8">
        {tabs.map((tab) => (
          <Skeleton key={tab} className="h-4 w-16" />
        ))}
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="panel space-y-4 p-5 sm:p-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </Shell>
  );
}

export function PracticePageSkeleton() {
  return (
    <Shell>
      <Skeleton className="h-4 w-16" />
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="mt-3 h-1 w-full" />
      <div className="mx-auto mt-10 max-w-xl">
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="mx-auto mt-6 h-4 w-48" />
      </div>
    </Shell>
  );
}

export function AuthFormSkeleton() {
  return (
    <div className="max-w-sm space-y-4 py-12">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-full max-w-xs" />
      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
