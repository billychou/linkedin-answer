import HeaderLinks from "@/components/header/HeaderLinks";
import MobileMenu from "@/components/header/MobileMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { siteConfig } from "@/config/site";
import Link from "next/link";
import Image from "next/image";

const Header = () => {
  return (
    <header className="py-2 px-6 backdrop-blur-md sticky top-0 z-50">
      <nav className="flex justify-between items-center w-full mx-auto">
        <div className="flex items-center space-x-6 md:space-x-12">
          <Link
            href="/"
            prefetch={false}
            className="flex items-center space-x-1 font-bold"
          >
            <Image
              alt={siteConfig.name}
              src="/logo.svg"
              className="w-6 h-6"
              width={32}
              height={32}
            />
            <span className="text-gray-800 dark:text-gray-200">
              LinkedIn Answer Today
            </span>
          </Link>
          <HeaderLinks />
        </div>

        <div className="flex items-center gap-x-2 md:gap-x-4 lg:gap-x-6 flex-1 justify-end">
          {/* PC */}
          <div className="hidden md:flex items-center gap-x-4">
            <ThemeToggle />
          </div>

          {/* Mobile */}
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
};

export default Header;
