import Badges from "@/components/footer/Badges";
import { siteConfig } from "@/config/site";
import { MailIcon } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <div className="bg-gray-900 text-gray-300">
      <footer className="py-2 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-12 lg:grid-cols-6">
            <div className="w-full flex flex-col sm:flex-row lg:flex-col gap-4 col-span-full md:col-span-2">
              <div className="space-y-4 flex-1">
                <div className="items-center space-x-2 flex">
                  <h2 className="highlight-text text-2xl font-bold">
                    LinkedIn Answer Today
                  </h2>
                </div>

                <p className="text-sm p4-4 md:pr-12">LinkedIn Answer Today</p>

                <div className="flex items-center gap-2">
                  {siteConfig.socialLinks?.email && (
                    <Link
                      href={`mailto:${siteConfig.socialLinks.email}`}
                      prefetch={false}
                      target="_blank"
                      rel="noreferrer nofollow noopener"
                      aria-label="Email"
                      title="Email"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                    >
                      <MailIcon className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
           </div>

          <div className="border-t border-gray-800 py-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              Copyright © {new Date().getFullYear()} {siteConfig.name} All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                href="/privacy-policy"
                title="Privacy Policy"
                prefetch={false}
                className="text-gray-400 hover:text-white text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-of-service"
                title="Terms of Service"
                prefetch={false}
                className="text-gray-400 hover:text-white text-sm"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        <Badges />
      </footer>
    </div>
  );
}
