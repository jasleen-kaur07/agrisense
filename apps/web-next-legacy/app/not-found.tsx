import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="mb-3 text-4xl">Page not found</h1>
      <p className="mb-6 text-ink2">We could not find that page.</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-forest px-5 font-semibold text-surface">Go to the start</Link>
    </main>
  );
}
