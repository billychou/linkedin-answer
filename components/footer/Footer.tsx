import { Bluesky, Github, Mail, Twitter } from "@/components/social-icons/icons";
import NewsletterForm from "@/components/footer/NewsletterForm";
import { siteConfig } from "@/config/site";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

const footerLinks = [
  { name: "Games", href: "/games" },
  { name: "Blog", href: "/blog" },
  { name: "About", href: "/about" },
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Terms of Service", href: "/terms-of-service" },
];

const socialIconClass =
  "rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <NewsletterForm />
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:px-6 md:h-16 md:flex-row md:gap-6 md:py-0">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        >
          {footerLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {link.name}
            </Link>
          ))}
          <a
            href="https://json.linkedinanswer.today"
            target="_blank"
            rel="noreferrer nofollow noopener"
            className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            JSON Feed
            <ExternalLink className="h-3 w-3" />
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {siteConfig.socialLinks?.twitter && (
            <a
              href={siteConfig.socialLinks.twitter}
              target="_blank"
              rel="noreferrer nofollow noopener"
              aria-label="Twitter/X"
              title="Twitter/X"
              className={socialIconClass}
            >
              <Twitter className="h-5 w-5 fill-current" />
            </a>
          )}
          {siteConfig.socialLinks?.github && (
            <a
              href={siteConfig.socialLinks.github}
              target="_blank"
              rel="noreferrer nofollow noopener"
              aria-label="GitHub"
              title="GitHub"
              className={socialIconClass}
            >
              <Github className="h-5 w-5 fill-current" />
            </a>
          )}
          {siteConfig.socialLinks?.bluesky && (
            <a
              href={siteConfig.socialLinks.bluesky}
              target="_blank"
              rel="noreferrer nofollow noopener"
              aria-label="Bluesky"
              title="Bluesky"
              className={socialIconClass}
            >
              <Bluesky className="h-5 w-5 fill-current" />
            </a>
          )}
          {siteConfig.socialLinks?.email && (
            <a
              href={`mailto:${siteConfig.socialLinks.email}`}
              aria-label="Email"
              title="Email"
              className={socialIconClass}
            >
              <Mail className="h-5 w-5 fill-current" />
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
