import MDXComponents from "@/components/mdx/MDXComponents";
import { constructMetadata } from "@/lib/metadata";
import fs from "fs/promises";
import { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import path from "path";
import remarkGfm from "remark-gfm";

const options = {
  parseFrontmatter: true,
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
};

async function getMDXContent() {
  const filePath = path.join(
    process.cwd(),
    "content",
    "privacy-policy",
    "en.mdx"
  );
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    console.error(`Error reading MDX file: ${error}`);
    return "";
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return constructMetadata({
    page: "PrivacyPolicy",
    title: "Privacy Policy",
    description: "Privacy Policy for LinkedIn Answer Today — how we collect, use, and protect your personal information.",
    path: `/privacy-policy`,
    canonicalUrl: `/privacy-policy`,
  });
}

export default async function PrivacyPolicyPage() {
  const content = await getMDXContent();

  return (
    <article className="w-full md:w-3/5 px-2 md:px-12">
      <MDXRemote
        source={content}
        components={MDXComponents}
        options={options}
      />
    </article>
  );
}
