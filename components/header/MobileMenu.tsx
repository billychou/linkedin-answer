"use client";

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
import Link from "next/link";
import { HeaderLink } from "@/types/common";
import { Menu } from "lucide-react";
import Image from "next/image";

export default function MobileMenu() {
  // Hardcoded header links in English
  const headerLinks: HeaderLink[] = [
    {
      name: "Pinpoint",
      href: "/games/pinpoint"
    }
  ];

  return (
    <div className="flex items-center gap-1 md:hidden">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger className="p-2">
          <Menu className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <Link
              href="/"
              title="LinkedIn Answer Today"
              prefetch={true}
              className="flex items-center space-x-1 font-bold"
            >
              <Image
                alt="LinkedIn Answer Today"
                src="/logo.svg"
                className="w-6 h-6"
                width={32}
                height={32}
              />
              <span className="highlight-text">LinkedIn Answer Today</span>
            </Link>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {headerLinks.map((link) => (
              <DropdownMenuItem key={link.name}>
                <Link
                  href={link.href}
                  title={link.name}
                  prefetch={
                    link.target && link.target === "_blank" ? false : true
                  }
                  target={link.target || "_self"}
                  rel={link.rel || undefined}
                >
                  {link.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
