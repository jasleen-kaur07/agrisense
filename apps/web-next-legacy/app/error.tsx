"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" role="alert" className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="mb-3 text-4xl">Something went wrong</h1>
      <p className="mb-6 text-ink2">An unexpected error occurred. Please try again.</p>
      <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-forest px-5 font-semibold text-surface">Try again</button>
    </main>
  );
}
