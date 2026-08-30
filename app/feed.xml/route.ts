import { getTodayAnswer } from "@/lib/answers";
import { getPosts } from "@/lib/getBlogs";
import { getAllGames } from "@/lib/games";
import { siteConfig } from "@/config/site";

export const dynamic = "force-static";
export const revalidate = false;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const games = getAllGames();
  const { posts } = await getPosts("en");
  const buildTime = new Date().toISOString();

  const answerItems = games
    .map((game) => ({ game, answer: getTodayAnswer(game.slug) }))
    .filter(({ answer }) => answer !== undefined)
    .map(({ game, answer }) => {
      const url = `${siteConfig.url}/games/${game.slug}/${answer!.date}`;
      const answerText = Array.isArray(answer!.answer)
        ? answer!.answer.join(", ")
        : answer!.answer;
      return `    <item>
      <title>${escapeXml(`${game.name} Answer — ${answer!.date}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(`The ${game.name} answer for ${answer!.date} is: ${answerText}.`)}</description>
      <pubDate>${new Date(`${answer!.date}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`;
    });

  const blogItems = posts.slice(0, 20).map((post) => {
    const url = `${siteConfig.url}/blog${post.slug}`;
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.description || "")}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`;
  });

  const todayItem = `    <item>
      <title>${escapeXml("All LinkedIn Game Answers Today")}</title>
      <link>${siteConfig.url}/today</link>
      <guid isPermaLink="false">today-${buildTime.slice(0, 10)}</guid>
      <description>${escapeXml("Daily answers for every LinkedIn game — Pinpoint, Crossclimb, Zip, Queens, Tango, Patches, and Mini Sudoku.")}</description>
      <pubDate>${new Date(buildTime).toUTCString()}</pubDate>
    </item>`;

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${siteConfig.url}</link>
    <description>${escapeXml(siteConfig.description ?? "")}</description>
    <language>en</language>
    <lastBuildDate>${new Date(buildTime).toUTCString()}</lastBuildDate>
    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml"/>
${[todayItem, ...answerItems, ...blogItems].join("\n")}
  </channel>
</rss>
`;

  return new Response(rss, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
