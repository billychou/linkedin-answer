import { constructMetadata } from "@/lib/metadata";
import { getPosts } from "@/lib/getBlogs";
import { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  return constructMetadata({
    page: "Blog",
    title: "Blog - LinkedIn Games Guides & Strategies",
    description:
      "Guides, strategies and daily insights for LinkedIn Games — Pinpoint, Queens, Tango, Zip, Crossclimb, Patches and Mini Sudoku.",
    path: "/blog",
    canonicalUrl: "/blog",
  });
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPage() {
  const { posts } = await getPosts("en");

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Blog
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Guides, strategies and daily insights for every LinkedIn puzzle game.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border-2 border-border bg-card p-6 text-sm text-muted-foreground">
          No posts yet. Check back soon!
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog${post.slug}`}
              className="block rounded-xl border-2 border-border bg-card p-4 sm:p-6 transition-colors hover:border-primary/50"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                {post.title}
              </h2>
              {post.description && (
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-3">
                  {post.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <time dateTime={new Date(post.date).toISOString()}>
                  {formatDate(post.date)}
                </time>
                {post.tags && (
                  <>
                    <span aria-hidden>·</span>
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags
                        .split(",")
                        .slice(0, 4)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-2 py-0.5"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
