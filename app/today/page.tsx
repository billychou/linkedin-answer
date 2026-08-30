import { getTodayAnswer } from "@/lib/answers";
import { getAllGames } from "@/lib/games";
import { constructMetadata } from "@/lib/metadata";
import { siteConfig } from "@/config/site";
import { Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";

export async function generateMetadata(): Promise<
  ReturnType<typeof constructMetadata>
> {
  const today = new Date().toISOString().split("T")[0];
  const formatted = formatLongDate(today);

  return constructMetadata({
    page: "Today",
    title: `All LinkedIn Game Answers Today (${formatted})`,
    description: `All LinkedIn game answers for today, ${formatted}: Pinpoint, Crossclimb, Zip, Queens, Tango, Patches, and Mini Sudoku — updated daily with solutions and explanations.`,
    path: "/today",
    canonicalUrl: "/today",
  });
}

function formatLongDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatAnswerText(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.join(", ") : answer;
}

export default function TodayPage() {
  const games = getAllGames();
  const today = new Date().toISOString().split("T")[0];
  const formattedToday = formatLongDate(today);

  const todaysAnswers = games
    .map((game) => ({
      game,
      answer: getTodayAnswer(game.slug),
    }))
    .filter(({ answer }) => answer !== undefined);

  const breadcrumbs = [
    { label: "Home", url: "/" },
    { label: "Today's Answers", url: "/today" },
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: crumb.label,
          item: `${siteConfig.url}${crumb.url}`,
        })),
      },
      {
        "@type": "CollectionPage",
        name: `All LinkedIn Game Answers Today (${formattedToday})`,
        description: `Daily answers for every LinkedIn game — Pinpoint, Crossclimb, Zip, Queens, Tango, Patches, and Mini Sudoku.`,
        url: `${siteConfig.url}/today`,
        datePublished: today,
        dateModified: today,
        hasPart: todaysAnswers.map(({ game, answer }) => ({
          "@type": "CreativeWork",
          name: `${game.name} Answer — ${formatLongDate(answer!.date)}`,
          url: `${siteConfig.url}/games/${game.slug}/${answer!.date}`,
          datePublished: answer!.date,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: todaysAnswers.map(({ game, answer }) => ({
          "@type": "Question",
          name: `What is today's ${game.name} answer?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `The ${game.name} answer for ${formatLongDate(answer!.date)} is: ${formatAnswerText(answer!.answer)}.`,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Calendar className="h-4 w-4" />
            {formattedToday}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            All LinkedIn Game Answers Today
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Every LinkedIn game answer for today — Pinpoint, Crossclimb, Zip,
            Queens, Tango, Patches, and Mini Sudoku. Answers are updated daily
            as soon as new puzzles go live, with explanations so you understand
            why each answer works.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {todaysAnswers.map(({ game, answer }) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}/${answer!.date}`}
              className="group rounded-xl border-2 border-border bg-card p-5 transition-colors hover:border-primary"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-primary">
                  {game.name}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {answer!.sequence}
                </span>
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {formatAnswerText(answer!.answer)}
              </p>
              <p className="mt-3 text-sm font-medium text-primary">
                View answer &rarr;
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-muted/40 p-6">
          <h2 className="font-display text-xl font-bold text-foreground">
            Missed a day?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse full archives of past answers for every game, or learn the
            rules and strategies before you play.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {games.map((game) => (
              <Link
                key={game.slug}
                href={`/games/${game.slug}/archives`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {game.name} archives
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {todaysAnswers.slice(0, 4).map(({ game }) => (
              <Link
                key={game.slug}
                href={`/games/${game.slug}/how-to-play`}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                How to play {game.name}
              </Link>
            ))}
            <Link
              href="/blog"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Strategy guides on the blog
            </Link>
          </div>
        </div>

        <div className="mt-10 text-sm text-muted-foreground">
          <p>
            Prefer playing on LinkedIn? Open{" "}
            <a
              href="https://www.linkedin.com/games"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              LinkedIn Games
              <ExternalLink className="h-3 w-3" />
            </a>{" "}
            and come back here whenever you get stuck.
          </p>
        </div>
      </div>
    </>
  );
}
