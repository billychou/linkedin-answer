"use client";

import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import UserMenu from "@/components/auth/UserMenu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { GOOGLE_CLIENT_ID, initializeGoogleSignIn } from "@/lib/googleAuth";
import { useUserStore } from "@/stores/userStore";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { FaGoogle } from "react-icons/fa";

interface UserAuthProps {
  /**
   * Mobile variant renders flat content (no nested dropdown) so it can be
   * placed inside the mobile navigation DropdownMenu.
   */
  mobile?: boolean;
}

/**
 * Login-state switch for the header. Renders nothing until mounted so the
 * statically prerendered header stays hydration-safe.
 */
export default function UserAuth({ mobile = false }: UserAuthProps) {
  const user = useUserStore((state) => state.user);
  const signIn = useUserStore((state) => state.signIn);
  const signOut = useUserStore((state) => state.signOut);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Drop sessions whose Google ID token has expired.
    const current = useUserStore.getState().user;
    if (current?.exp && current.exp * 1000 < Date.now()) {
      signOut();
    }
  }, [signOut]);

  const handleMobileSignIn = () => {
    // Fast path: GIS was already initialized on mount by the desktop
    // variant, so open the account chooser synchronously within the click.
    if (typeof google !== "undefined" && google.accounts?.id) {
      google.accounts.id.prompt();
      return;
    }
    void initializeGoogleSignIn((credential) => signIn(credential)).then(
      (ok) => {
        if (ok) google.accounts.id.prompt();
      }
    );
  };

  if (!mounted) return null;

  // Logged out
  if (!user) {
    if (!GOOGLE_CLIENT_ID) return null;
    if (mobile) {
      return (
        <DropdownMenuItem onSelect={handleMobileSignIn}>
          <FaGoogle className="h-4 w-4" />
          Sign in with Google
        </DropdownMenuItem>
      );
    }
    return <GoogleSignInButton />;
  }

  // Logged in
  if (mobile) {
    return (
      <>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {user.picture && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture}
              alt={user.name}
              className="h-8 w-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <DropdownMenuItem onSelect={() => signOut()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </>
    );
  }

  return <UserMenu />;
}
