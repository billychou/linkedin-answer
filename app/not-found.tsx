import Link from "next/link";
import { constructMetadata } from "@/lib/metadata";
import { games } from "@/data/games";

export const metadata = constructMetadata({
  page: "404",
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist. Browse our daily LinkedIn game answers instead.",
  path: "/404",
});

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center">
      <h1 className="text-6xl sm:text-8xl font-bold text-slate-900 dark:text-gray-100 mb-4">
        404
      </h1>
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
        Page Not Found
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Check out our daily LinkedIn game answers instead.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors mb-12"
      >
        Back to Home
      </Link>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Popular Games
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {games.map((game) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className="px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors text-center"
            >
              {game.name.replace("LinkedIn ", "")}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
