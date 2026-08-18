"use client";

import UserAuth from "@/components/auth/UserAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { HeaderLink } from "@/types/common";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileMenu() {
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
    }
  ];

  return (
    <div className="flex items-center gap-1 lg:hidden">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Open menu"
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Menu className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <Link
              href="/"
              title="LinkedIn Answer Today"
              className="flex items-center space-x-1 font-bold"
            >
              <Image
                alt="LinkedIn Answer Today"
                src="/logo.svg"
                className="w-6 h-6"
                width={32}
                height={32}
              />
              <span className="font-display font-bold">LinkedIn Answer Today</span>
            </Link>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {headerLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <DropdownMenuItem
                  key={link.name}
                  asChild
                  className={cn(isActive && "bg-primary/10")}
                >
                  <a
                    href={link.href}
                    title={link.name}
                    target={link.target || "_self"}
                    rel={link.rel || undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "w-full outline-none",
                      isActive && "font-semibold text-primary"
                    )}
                  >
                    {link.name}
                  </a>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <UserAuth mobile />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
