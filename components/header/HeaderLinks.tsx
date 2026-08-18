"use client";

import { cn } from "@/lib/utils";
import { HeaderLink } from "@/types/common";
import { ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";

const HeaderLinks = () => {
  const pathname = usePathname();

  // Hardcoded header links in English
  const headerLinks: HeaderLink[] = [
    {
      name: "Games",
      href: "/games"
    },
    {
      name: "Pinpoint",
      href: "/games/pinpoint"
    },
    {
      name: "Chat",
      href: "/chat"
    },
    {
      name: "Pricing",
      href: "/pricing"
    }
  ];

  return (
    <div className="hidden lg:flex flex-row items-center gap-x-1 text-sm font-medium text-muted-foreground">
      {headerLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <a
            key={link.name}
            href={link.href}
            title={link.name}
            target={link.target || "_self"}
            rel={link.rel || undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-x-1 rounded-full px-4 py-2 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive
                ? "bg-primary/10 font-semibold text-primary"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {link.name}
            {link.target && link.target === "_blank" && (
              <span className="text-xs">
                <ExternalLink className="w-4 h-4" />
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
};

export default HeaderLinks;
