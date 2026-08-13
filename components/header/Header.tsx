import UserAuth from "@/components/auth/UserAuth";
import HeaderLinks from "@/components/header/HeaderLinks";
import MobileMenu from "@/components/header/MobileMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { siteConfig } from "@/config/site";
import Image from "next/image";
import Link from "next/link";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center space-x-6 lg:space-x-10">
          <Link
            href="/"
            title={siteConfig.name}
            className="flex items-center space-x-2 font-display font-bold tracking-tight"
          >
            <Image
              alt={siteConfig.name}
              src="/logo.svg"
              className="h-7 w-7"
              width={28}
              height={28}
            />
            <span className="hidden text-foreground sm:inline">
              {siteConfig.name}
            </span>
          </Link>
          <HeaderLinks />
        </div>

        <div className="flex flex-1 items-center justify-end gap-x-2 md:gap-x-4">
          {/* PC */}
          <div className="hidden items-center gap-x-4 lg:flex">
            <ThemeToggle />
            <UserAuth />
          </div>

          {/* Mobile / Tablet */}
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
};

export default Header;
