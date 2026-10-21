import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">404 - Page Not Found</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          The requested page could not be found.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 text-sm font-medium rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
