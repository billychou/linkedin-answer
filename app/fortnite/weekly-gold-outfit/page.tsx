import Link from "next/link";
import { CalendarDays, Gift, Sparkles } from "lucide-react";
import { constructMetadata } from "@/lib/metadata";
import { siteConfig } from "@/config/site";
import {
  WeeklyGoldOutfit,
  getCurrentGoldWeek,
  weeklyGoldOutfits,
} from "@/data/fortnite/weeklyGoldOutfit";

const PAGE_PATH = "/fortnite/weekly-gold-outfit";
const PAGE_URL = `${siteConfig.url}${PAGE_PATH}`;
const PAGE_TITLE = "Fortnite Weekly Gold Outfit";

const DATA_SOURCES = [
  { name: "IGN", url: "https://www.ign.com/wikis/fortnite/All_Free_Treasure_Chest_Rewards_List_-_Odds_and_Schedule" },
  { name: "fortnite.gg", url: "https://fortnite.gg/free-cosmetics" },
];

type Faq = { question: string; answer: string };

/** "2026-11-08" → "Nov 8, 2026"（UTC 解析，避免构建机时区漂移） */
function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRange(week: WeeklyGoldOutfit): string {
  return `${formatDay(week.date)} – ${formatDay(week.endDate)}`;
}

/** "2026-11-08" → "Nov 8"（meta description 用的短格式） */
function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** 按词边界截断到 ≤160 字符（与 app/games/[gameSlug]/[date]/page.tsx 同款策略） */
function clampDescription(text: string): string {
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).replace(/\s+\S*$/, "")}...`;
}

export async function generateMetadata(): Promise<
  ReturnType<typeof constructMetadata>
> {
  const { current } = getCurrentGoldWeek();
  const description = current
    ? clampDescription(
        `This week's Fortnite weekly gold outfit is ${current.outfitName} (${formatDayShort(current.date)} – ${formatDayShort(current.endDate)}). Free Solid Gold chest drop — odds, steps, and past weeks.`
      )
    : "Fortnite weekly gold outfit guide: this week's free Solid Gold skin, chest drop odds, how to get it, rotation schedule, and past weeks archive.";
  return constructMetadata({
    page: "Fortnite",
    title: PAGE_TITLE,
    description,
    keywords: [
      "weekly gold outfit fortnite",
      "fortnite weekly gold outfit",
      "fortnite solid gold skin this week",
      "fortnite treasure chest gold outfit",
      "free solid gold fortnite",
      "fortnite weekly rewards",
    ],
    path: PAGE_PATH,
    canonicalUrl: PAGE_PATH,
  });
}

/** 可见 FAQ 区块与 FAQPage JSON-LD 消费同一数组（Google 要求结构化数据与页面内容一致） */
function buildFaqs(current: WeeklyGoldOutfit | undefined): Faq[] {
  if (!current) {
    return [
      {
        question: "What is the Fortnite weekly gold outfit?",
        answer:
          "Each week of the season, one Solid Gold version of an outfit becomes a free random drop from Treasure Chests in Fortnite Battle Royale. A new gold outfit replaces it every Sunday morning (6AM PT / 9AM ET).",
      },
    ];
  }
  const rewardsAnswer = current.extraRewards?.length
    ? `Besides the gold outfit, this week's chest pool reportedly also includes ${current.extraRewards
        .map((r) => `${r.name} (${r.type})`)
        .join(", ")}, among other rotating cosmetics.`
    : "The weekly chest pool also rotates other cosmetic rewards alongside the gold outfit.";
  return [
    {
      question: "What is this week's gold outfit in Fortnite?",
      answer: `This week's gold outfit is the ${current.outfitName} outfit, in the chest pool ${formatRange(current)}. It is a free random drop from Treasure Chests in Battle Royale.`,
    },
    {
      question: "How do I get the weekly gold outfit for free?",
      answer:
        "Play any Battle Royale match during the week and open Treasure Chests. The Solid Gold outfit is a random chest drop — completely free, with no purchase, Battle Pass tier, or quest chain required.",
    },
    {
      question: "Do I need to complete quests to unlock the gold outfit?",
      answer:
        "No. Quests are not required — the weekly Solid Gold outfit drops randomly from Treasure Chests. The season's weekly quests award XP and season progression, but they are separate from the gold outfit drop.",
    },
    {
      question: "When does the weekly gold outfit rotate?",
      answer:
        "A new Solid Gold outfit replaces the current one every Sunday morning (6AM PT / 9AM ET). Each weekly window lasts about seven days, so claim it before the next rotation starts.",
    },
    {
      question: "What are the odds of finding the gold outfit in a chest?",
      answer: `The drop rate is extremely low — reportedly ${current.odds ?? "about 1 in 1,562,500 chests"}. Every chest you open is another chance, so keep farming chests across matches during the week.`,
    },
    {
      question: "What other rewards are in this week's chest pool?",
      answer: rewardsAnswer,
    },
  ];
}

function GoldOutfitJsonLd({
  current,
  faqs,
}: {
  current: WeeklyGoldOutfit | undefined;
  faqs: Faq[];
}) {
  const organization = {
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  };
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${siteConfig.url}/`,
        },
        { "@type": "ListItem", position: 2, name: PAGE_TITLE, item: PAGE_URL },
      ],
    },
    {
      "@type": "Article",
      headline: `${PAGE_TITLE} — This Week's Free Solid Gold Skin`,
      description:
        "Which gold outfit is free in Fortnite this week, how to get it from Treasure Chests, the reported drop odds, and the full archive of past weekly Solid Gold skins.",
      url: PAGE_URL,
      mainEntityOfPage: PAGE_URL,
      ...(current ? { dateModified: current.date } : {}),
      author: organization,
      publisher: organization,
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@type": "ItemList",
      name: "Fortnite weekly gold outfit archive",
      itemListElement: weeklyGoldOutfits.map((week, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${week.weekLabel} — ${week.outfitName} (${formatRange(week)})`,
      })),
    },
  ];
  const data = { "@context": "https://schema.org", "@graph": graph };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function ThisWeekCard({
  current,
  isLive,
}: {
  current: WeeklyGoldOutfit;
  isLive: boolean;
}) {
  return (
    <section className="rounded-xl border-2 border-border bg-card p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
            isLive
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/30 bg-warning/10 text-warning"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isLive ? "animate-pulse bg-success" : "bg-warning"}`}
            aria-hidden="true"
          />
          {isLive ? "Live now" : "Ended — next drop Sunday"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {current.weekLabel} · {formatRange(current)}
        </span>
      </div>

      <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        <span className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 bg-clip-text text-transparent dark:from-amber-300 dark:via-yellow-300 dark:to-amber-500">
          {current.outfitName}
        </span>
      </h2>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        {current.season} · Free Treasure Chest drop in Battle Royale · ends the
        following Sunday
      </p>

      {current.odds && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
          <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
          {current.odds}
        </p>
      )}

      {current.extraRewards && current.extraRewards.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground">
            Also in this week&apos;s chest pool
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {current.extraRewards.map((reward) => (
              <li
                key={reward.name}
                className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
              >
                <Gift
                  className="mr-1 inline h-3 w-3 text-primary"
                  aria-hidden="true"
                />
                {reward.name}
                <span className="text-foreground/60"> · {reward.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function HowToGetSteps({ steps }: { steps: string[] }) {
  return (
    <section className="mt-8 rounded-xl border-2 border-border bg-card p-4 sm:p-6">
      <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
        How to get this week&apos;s gold outfit for free
      </h2>
      <ol className="mt-3 list-decimal list-inside space-y-2 text-sm text-muted-foreground sm:text-base">
        {steps.map((step) => (
          <li key={step} className="pl-1">
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}

function OddsAndSchedule({ current }: { current: WeeklyGoldOutfit }) {
  const firstWeek = weeklyGoldOutfits[weeklyGoldOutfits.length - 1];
  return (
    <>
      <section className="mt-8 rounded-xl border-2 border-border bg-card p-4 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
          Drop odds: how rare is the Solid Gold skin?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          The weekly gold outfit is reportedly one of the rarest free drops in
          Fortnite — community tracking puts it at{" "}
          {current.odds ?? "about 1 in 1,562,500 chests"}. Every Treasure Chest
          you open is another roll, so there is no trick that guarantees it:
          land at chest-dense locations, open everything you find, and keep
          queuing through the week. Treat it as a chase cosmetic — but unlike
          Item Shop exclusives, it costs nothing but play time.
        </p>
      </section>

      <section className="mt-8 rounded-xl border-2 border-border bg-card p-4 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
          Weekly rotation schedule
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          A new weekly gold outfit goes live every Sunday morning (6AM PT /
          9AM ET) and stays in the chest pool for about seven days, until the
          next Sunday reset.
          {firstWeek && (
            <>
              {" "}
              The {current.season} rotation started{" "}
              {formatDay(firstWeek.date)} with {firstWeek.outfitName}.
            </>
          )}{" "}
          This page refreshes automatically each week after the new rotation is
          confirmed — bookmark it to always know which gold outfit is live.
        </p>
      </section>
    </>
  );
}

function FaqSection({ faqs }: { faqs: Faq[] }) {
  return (
    <section className="mt-8 rounded-xl border-2 border-border bg-card p-4 sm:p-6">
      <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
        Frequently asked questions
      </h2>
      <div className="mt-5 space-y-5">
        {faqs.map((faq) => (
          <div key={faq.question}>
            <h3 className="font-semibold text-foreground">{faq.question}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PastWeeksArchive({ weeks }: { weeks: WeeklyGoldOutfit[] }) {
  if (weeks.length === 0) return null;
  return (
    <section className="mt-8 rounded-xl border-2 border-border bg-card p-4 sm:p-6">
      <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
        Past weekly gold outfits
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every Solid Gold outfit from the rotation, newest first.
      </p>
      <ul className="mt-4 divide-y divide-border">
        {weeks.map((week) => (
          <li
            key={week.sequence}
            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">{week.outfitName}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {week.weekLabel} · {formatRange(week)}
                {week.extraRewards && week.extraRewards.length > 0
                  ? ` · also: ${week.extraRewards.map((r) => r.name).join(", ")}`
                  : ""}
              </p>
            </div>
            {week.odds && (
              <span className="text-xs text-muted-foreground">
                {week.odds}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExploreMore() {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2">
      <Link
        href="/today"
        className="rounded-xl border-2 border-border bg-card p-4 transition-colors hover:border-primary/50 sm:p-5"
      >
        <h2 className="font-display text-base font-bold text-foreground">
          Today&apos;s LinkedIn game answers
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily solutions for Pinpoint, Queens, Crossclimb, and more.
        </p>
      </Link>
      <Link
        href="/games"
        className="rounded-xl border-2 border-border bg-card p-4 transition-colors hover:border-primary/50 sm:p-5"
      >
        <h2 className="font-display text-base font-bold text-foreground">
          Play free mini games
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          2048, Memory Match, Tic-Tac-Toe, and other quick browser games.
        </p>
      </Link>
    </section>
  );
}

function FanContentDisclaimer() {
  return (
    <footer className="mt-10 border-t border-border pt-6">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Fan content disclaimer: this page is fan-made and is not affiliated
        with, endorsed, sponsored, or reviewed by Epic Games. Fortnite and
        Solid Gold are trademarks or registered trademarks of Epic Games, Inc.
        in the United States and elsewhere. Weekly rotation data is compiled
        from community sources (
        {DATA_SOURCES.map((source, index) => (
          <span key={source.name}>
            {index > 0 && ", "}
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="underline transition-colors hover:text-foreground"
            >
              {source.name}
            </a>
          </span>
        ))}
        ); drop odds are community-reported estimates, not official figures.
      </p>
    </footer>
  );
}

export default async function WeeklyGoldOutfitPage() {
  const { current, isLive } = getCurrentGoldWeek();
  const faqs = buildFaqs(current);
  const pastWeeks = current
    ? weeklyGoldOutfits.filter((week) => week.sequence !== current.sequence)
    : weeklyGoldOutfits;

  return (
    <>
      <GoldOutfitJsonLd current={current} faqs={faqs} />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 text-sm text-muted-foreground"
        >
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="font-medium text-foreground">
            Fortnite Weekly Gold Outfit
          </span>
        </nav>

        {/* Header */}
        <header className="mb-6 space-y-3 sm:mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Fortnite Weekly Gold Outfit — This Week&apos;s Free Solid Gold Skin
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every week, Fortnite puts one <strong className="text-foreground">Solid Gold</strong>{" "}
            outfit into the Battle Royale Treasure Chest pool as a completely
            free random drop. Find out which gold outfit is live this week, how
            to get it, the reported drop odds, and when the rotation ends.
          </p>
        </header>

        {current ? (
          <>
            <ThisWeekCard current={current} isLive={isLive} />
            {!isLive && (
              <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                The {current.weekLabel} rotation has ended. A new gold outfit
                typically lands Sunday morning — this page updates
                automatically.
              </p>
            )}
            <HowToGetSteps steps={current.howToGet} />
            <OddsAndSchedule current={current} />
            <FaqSection faqs={faqs} />
            <PastWeeksArchive weeks={pastWeeks} />
          </>
        ) : (
          <p className="rounded-xl border-2 border-border bg-card p-6 text-sm text-muted-foreground">
            New rotation pending — check back Sunday after the weekly reset
            for the next weekly gold outfit.
          </p>
        )}

        <ExploreMore />
        <FanContentDisclaimer />
      </div>
    </>
  );
}
