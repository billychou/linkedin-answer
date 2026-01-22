import { Game } from "@/types/game";
import { GameAnswer } from "@/types/game";
import { siteConfig } from "@/config/site";

interface StructuredDataProps {
  game: Game;
  answer?: GameAnswer;
  type?: "Game" | "FAQPage";
}

export default function StructuredData({
  game,
  answer,
  type = "Game",
}: StructuredDataProps) {
  const gameUrl = `${siteConfig.url}/games/${game.slug}`;
  const playUrl = game.playUrl || gameUrl;

  const gameStructuredData = {
    "@context": "https://schema.org",
    "@type": "Game",
    name: game.name,
    description: game.description,
    url: gameUrl,
    gameLocation: playUrl,
    ...(answer && {
      datePublished: answer.date,
      answer: {
        "@type": "Answer",
        text: Array.isArray(answer.answer)
          ? answer.answer.join(", ")
          : answer.answer,
      },
    }),
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is ${game.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: game.description,
        },
      },
      ...(answer
        ? [
            {
              "@type": "Question",
              name: `What is today's answer for ${game.name}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: Array.isArray(answer.answer)
                  ? answer.answer.join(", ")
                  : answer.answer,
              },
            },
          ]
        : []),
    ],
  };

  const structuredData = type === "FAQPage" ? faqStructuredData : gameStructuredData;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
