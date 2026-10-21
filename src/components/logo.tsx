import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group text-xl font-semibold tracking-tight">
      cut
      <span className="inline-block text-accent transition-transform duration-300 group-hover:translate-x-0.5">
        .
      </span>
    </Link>
  );
}
