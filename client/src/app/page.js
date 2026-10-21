export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-xl text-center space-y-4">
        <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
          Phase 0 · Setup Ready
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Soil &amp; Soul
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
          E-commerce platform for live plants, gardening essentials, and natural care products.
        </p>
        <div className="pt-4 text-xs font-mono text-zinc-500 dark:text-zinc-500">
          Frontend client initialized successfully.
        </div>
      </div>
    </main>
  );
}
