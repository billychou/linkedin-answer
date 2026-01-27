"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HeaderLink } from "@/types/common";
import { ExternalLink } from "lucide-react";

const HeaderLinks = () => {
  const pathname = usePathname();

  // Hardcoded header links in English
  const headerLinks: HeaderLink[] = [
    {
      name: "Pinpoint",
      href: "/games/pinpoint"
    }
  ];

  return (
    <div className="hidden md:flex flex-row items-center gap-x-2 text-sm font-medium text-muted-500">
      {headerLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          title={link.name}
          target={link.target || "_self"}
          rel={link.rel || undefined}
          className={cn(
            "rounded-xl px-4 py-2 flex items-center gap-x-1 hover:bg-accent-foreground/10 hover:text-accent-foreground",
            pathname === link.href && "font-semibold text-accent-foreground"
          )}
        >
          {link.name}
          {link.target && link.target === "_blank" && (
            <span className="text-xs">
              <ExternalLink className="w-4 h-4" />
            </span>
          )}
        </a>
      ))}
    </div>
  );
};

export default HeaderLinks;
