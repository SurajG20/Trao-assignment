import Link from "next/link";

export function Brand({ href = "/kits" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-baseline gap-2 text-foreground">
      <span className="font-display text-xl font-semibold tracking-tight">
        Interview Prep Kit
      </span>
    </Link>
  );
}
