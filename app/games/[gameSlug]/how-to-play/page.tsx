import { notFound } from "next/navigation";
import { getGame, getGameSlugs } from "@/lib/games";
import StructuredData from "@/components/games/StructuredData";
import { constructMetadata } from "@/lib/metadata";
import { howToPlayContent } from "@/data/howToPlay";

type Props = {
  params: Promise<{ gameSlug: string }>;
};

export async function generateStaticParams() {
  const gameSlugs = getGameSlugs();
  return gameSlugs.map((slug) => ({
    gameSlug: slug,
  }));
}

export async function generateMetadata({
  params,
}: Props): Promise<ReturnType<typeof constructMetadata>> {
  const { gameSlug } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    return constructMetadata({
      page: "Game",
      title: "Game Not Found",
      description: "The requested game could not be found.",
      path: `/games/${gameSlug}/how-to-play`,
    });
  }

  return constructMetadata({
    page: "Game",
    title: `${game.name} - How to Play`,
    description: `Learn how to play ${game.name}. Rules, tips, and strategies for solving this LinkedIn puzzle game.`,
    path: `/games/${gameSlug}/how-to-play`,
    canonicalUrl: `/games/${gameSlug}/how-to-play`,
  });
}

export default async function HowToPlayPage({ params }: Props) {
  const { gameSlug } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    notFound();
  }

  const sections = howToPlayContent[game.slug as keyof typeof howToPlayContent] ?? [];
  const faqs = sections
    .flatMap((section) => section.faq ?? [])
    .filter((faq) => faq && faq.question && faq.answer);

  const breadcrumbs = [
    { label: "Home", url: "/" },
    { label: "Games", url: "/games" },
    { label: game.name, url: `/games/${gameSlug}` },
    { label: "How to Play", url: `/games/${gameSlug}/how-to-play` },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <StructuredData
        game={game}
        breadcrumbs={breadcrumbs}
        type="FAQPage"
        faqs={faqs}
      />
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {game.name} - How to Play
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Everything you need to know about {game.name}: the rules, how to play
          step by step, tips and strategies, and answers to common questions.
        </p>
      </div>

      <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-6">
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
          {game.description}
        </p>

        {game.playUrl && (
          <div className="mt-4 sm:mt-6">
            <a
              href={game.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              Play {game.name}
            </a>
          </div>
        )}
      </div>

      {sections.map((section) => (
        <section
          key={section.heading}
          className="mt-8 rounded-xl border-2 border-border bg-card p-4 sm:p-6"
        >
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            {section.heading}
          </h2>
          {section.paragraphs?.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
          {section.list && (
            section.ordered ? (
              <ol className="mt-3 list-decimal list-inside space-y-2 text-sm sm:text-base text-muted-foreground">
                {section.list.map((item) => (
                  <li key={item} className="pl-1">
                    {item}
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="mt-3 list-disc list-inside space-y-2 text-sm sm:text-base text-muted-foreground">
                {section.list.map((item) => (
                  <li key={item} className="pl-1">
                    {item}
                  </li>
                ))}
              </ul>
            )
          )}
          {section.faq && (
            <div className="mt-5 space-y-5">
              {section.faq.map((faq) => (
                <div key={faq.question}>
                  <h3 className="font-semibold text-foreground">
                    {faq.question}
                  </h3>
                  <p className="mt-1 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
