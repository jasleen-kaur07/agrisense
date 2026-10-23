import Link from "next/link";

export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <rect width="100" height="100" rx="22" fill="#19342d" />
      <path d="M50 18 C72 28 78 52 62 70 C54 79 44 80 36 76 C26 60 30 34 50 18 Z" fill="#f4f0e7" />
      <path d="M50 24 C47 44 46 62 40 80" stroke="#19342d" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2.5 font-sans text-lg font-extrabold tracking-tight text-forest">
      <BrandMark />
      AgriSense
    </Link>
  );
}
