import { Game } from "@/types/game";
import { GameAnswer } from "@/types/game";
import { siteConfig } from "@/config/site";

interface StructuredDataProps {
  game: Game;
  answer?: GameAnswer;
  type?: "Game" | "FAQPage";
  breadcrumbs?: { label: string; url: string }[];
  collectionItems?: { label: string; url: string; date?: string }[];
}

export default function StructuredData({
  game,
  answer,
  type = "Game",
  breadcrumbs,
  collectionItems,
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

  const breadcrumbData = breadcrumbs
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: crumb.label,
          item: crumb.url.startsWith("http") ? crumb.url : `${siteConfig.url}${crumb.url}`,
        })),
      }
    : null;

  const collectionData = collectionItems
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${game.name} Archives`,
        description: `Historical answers for ${game.name}`,
        url: gameUrl,
        hasPart: collectionItems.map((item) => ({
          "@type": "CreativeWork",
          name: `${game.name} - ${item.label}`,
          url: item.url.startsWith("http") ? item.url : `${siteConfig.url}${item.url}`,
          ...(item.date && { datePublished: item.date }),
        })),
      }
    : null;

  let structuredData: object | null = null;
  if (type === "FAQPage") {
    structuredData = faqStructuredData;
  } else if (breadcrumbs && collectionItems) {
    structuredData = {
      "@context": "https://schema.org",
      "@graph": [gameStructuredData, breadcrumbData, collectionData].filter(Boolean),
    };
  } else if (breadcrumbs) {
    structuredData = {
      "@context": "https://schema.org",
      "@graph": [gameStructuredData, breadcrumbData].filter(Boolean),
    };
  } else {
    structuredData = gameStructuredData;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
