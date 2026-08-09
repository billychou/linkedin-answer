import type { GoogleUser } from "@/types/user";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  user: GoogleUser | null;
  /** Set the user mirroring the server session (null = signed out). */
  setUser: (user: GoogleUser | null) => void;
  signOut: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
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
