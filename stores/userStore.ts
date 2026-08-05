import { decodeJwtPayload } from "@/lib/googleAuth";
import type { GoogleUser } from "@/types/user";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  user: GoogleUser | null;
  /** Decode a Google ID token (JWT) and store the user profile. */
  signIn: (credential: string) => void;
  signOut: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (credential) => {
        const payload = decodeJwtPayload(credential);
        if (!payload?.email) return;
        // Ignore tokens that are already expired.
        if (payload.exp && payload.exp * 1000 < Date.now()) return;
        set({
          user: {
            name: payload.name || payload.email,
            email: payload.email,
            picture: payload.picture || "",
            exp: payload.exp ?? 0,
          },
        });
      },
      signOut: () => {
        if (typeof google !== "undefined") {
          google.accounts?.id?.disableAutoSelect();
        }
        set({ user: null });
      },
    }),
    { name: "user-store" }
  )
);
