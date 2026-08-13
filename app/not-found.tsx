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
      <h1 className="text-6xl sm:text-8xl font-bold text-foreground mb-4">
        404
      </h1>
      <h2 className="text-xl sm:text-2xl font-semibold text-muted-foreground mb-2">
        Page Not Found
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Check out our daily LinkedIn game answers instead.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors mb-12"
      >
        Back to Home
      </Link>

      <div className="w-full max-w-2xl">
        <h3 className="text-lg font-semibold text-muted-foreground mb-4">
          Popular Games
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {games.map((game) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className="px-4 py-3 rounded-lg border-2 border-border bg-card text-muted-foreground font-medium text-sm hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors text-center"
            >
              {game.name.replace("LinkedIn ", "")}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
