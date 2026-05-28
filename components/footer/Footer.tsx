import Badges from "@/components/footer/Badges";
import { Bluesky, Github, Mail, Twitter } from "@/components/social-icons/icons";
import { siteConfig } from "@/config/site";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <div className="bg-gray-900 text-gray-300">
      <footer className="py-2 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 py-8">
            {/* Block 1 - Brand Info (col-span-2) */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <h2 className="highlight-text text-2xl font-bold mb-3">
                LinkedIn Answer Today
              </h2>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Your daily source for LinkedIn game answers. Get Pinpoint solutions with clues and explanations, updated every day.
              </p>
              {/* Social Icons */}
              <div className="flex items-center gap-3">
                {siteConfig.socialLinks?.twitter && (
                  <a
                    href={siteConfig.socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer nofollow noopener"
                    aria-label="Twitter/X"
                    title="Twitter/X"
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    <Twitter className="w-5 h-5 fill-current" />
                  </a>
                )}
                {siteConfig.socialLinks?.github && (
                  <a
                    href={siteConfig.socialLinks.github}
                    target="_blank"
                    rel="noreferrer nofollow noopener"
                    aria-label="GitHub"
                    title="GitHub"
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    <Github className="w-5 h-5 fill-current" />
                  </a>
                )}
                {siteConfig.socialLinks?.bluesky && (
                  <a
                    href={siteConfig.socialLinks.bluesky}
                    target="_blank"
                    rel="noreferrer nofollow noopener"
                    aria-label="BlueSky"
                    title="BlueSky"
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    <Bluesky className="w-5 h-5 fill-current" />
                  </a>
                )}
                {siteConfig.socialLinks?.email && (
                  <a
                    href={`mailto:${siteConfig.socialLinks.email}`}
                    target="_blank"
                    rel="noreferrer nofollow noopener"
                    aria-label="Email"
                    title="Email"
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    <Mail className="w-5 h-5 fill-current" />
                  </a>
                )}
              </div>
            </div>

            {/* Block 2 - Games Links (col-span-1) */}
            <div className="col-span-1">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                Games
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/games/pinpoint"
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    Pinpoint
                  </Link>
                </li>
                <li>
                  <Link
                    href="/games/pinpoint/archives"
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    Pinpoint Archives
                  </Link>
                </li>
                <li>
                  <Link
                    href="/games/pinpoint/how-to-play"
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    How to Play
                  </Link>
                </li>
              </ul>
            </div>

            {/* Block 3 - Resources Links (col-span-1) */}
            <div className="col-span-1">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                Resources
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-of-service"
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <a
                    href="https://json.linkedinanswer.today"
                    target="_blank"
                    rel="noreferrer nofollow noopener"
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200 inline-flex items-center gap-1"
                  >
                    JSON Feed
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Block 4 - Stay Updated (col-span-2) */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                Stay Updated
              </h3>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Check back daily for the latest LinkedIn game answers and strategies.
              </p>
              <a
                href="https://www.linkedin.com/games/"
                target="_blank"
                rel="noreferrer nofollow noopener"
                className="inline-flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white rounded-md text-sm font-medium transition-colors duration-200"
              >
                Visit LinkedIn Games
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="border-t border-gray-800 py-6 flex flex-col md:flex-row justify-center items-center">
            <p className="text-gray-400 text-sm">
              Copyright © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
            </p>
          </div>
        </div>

        <Badges />
      </footer>
    </div>
  );
}
