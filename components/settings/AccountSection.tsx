"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/authClient";
import type { ProfileUser } from "@/types/user";
import { LogOut } from "lucide-react";

export function AccountSection({ profile }: { profile: ProfileUser }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-5">
        <div className="space-y-1">
          <p className="text-sm font-medium">Email</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <p className="text-xs text-muted-foreground">
            Provided and verified by your Google account. Not editable.
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Sign-in method</p>
          <p className="text-sm text-muted-foreground">Google</p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Member since</p>
          <p className="text-sm text-muted-foreground">
            {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-3">
        <p className="text-sm font-medium">Sign out</p>
        <p className="text-xs text-muted-foreground">
          Ends this session on this device. Your profile and settings are kept.
        </p>
        <Button variant="outline" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
