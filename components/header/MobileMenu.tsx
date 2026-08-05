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
import { HeaderLink } from "@/types/common";
import { Menu } from "lucide-react";
import Image from "next/image";

export default function MobileMenu() {
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
      name: "Patches",
      href: "/games/patches"
    },
    {
      name: "Zip",
      href: "/games/zip"
    },
    {
      name: "Tango",
      href: "/games/tango"
    },
    {
      name: "Queens",
      href: "/games/queens"
    },
    // {
    //   name: "Mini Sudoku",
    //   href: "/games/mini-sudoku"
    // },
    {
      name: "Crossclimb",
      href: "/games/crossclimb"
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
            <a
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
              <span className="highlight-text">LinkedIn Answer Today</span>
            </a>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {headerLinks.map((link) => (
              <DropdownMenuItem key={link.name}>
                <a
                  href={link.href}
                  title={link.name}
                  target={link.target || "_self"}
                  rel={link.rel || undefined}
                >
                  {link.name}
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <UserAuth mobile />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
