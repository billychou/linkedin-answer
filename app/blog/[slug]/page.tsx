import MDXComponents from "@/components/mdx/MDXComponents";
import { getPosts } from "@/lib/getBlogs";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { notFound } from "next/navigation";
import Link from "next/link";
import remarkGfm from "remark-gfm";

export const dynamic = "force-static";

const mdxOptions = {
  parseFrontmatter: true,
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
};

type Props = {
  params: Promise<{ slug: string }>;
};

async function getPost(slug: string) {
  const { posts } = await getPosts("en");
  return posts.find((post) => post.slug === `/${slug}`);
}

export async function generateStaticParams() {
  const { posts } = await getPosts("en");
  return posts.map((post) => ({ slug: post.slug.replace(/^\//, "") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return constructMetadata({
      page: "Blog",
      title: "Post Not Found",
      description: "The requested blog post could not be found.",
      path: `/blog/${slug}`,
    });
  }

  return constructMetadata({
    page: "Blog",
    title: post.title,
    description: post.description,
    keywords: post.tags ? post.tags.split(",").map((t) => t.trim()) : undefined,
    path: `/blog${post.slug}`,
    canonicalUrl: `/blog${post.slug}`,
  });
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/blog"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Blog
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          {post.title}
        </h1>
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
                {post.tags.split(",").map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      <article>
        <MDXRemote
          source={post.content}
          components={MDXComponents}
          options={mdxOptions}
        />
      </article>
    </div>
  );
}
