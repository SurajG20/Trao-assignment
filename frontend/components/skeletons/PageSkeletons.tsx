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
