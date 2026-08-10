"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "@/lib/authClient";
import type { ProfileUser } from "@/types/user";
import { useState } from "react";

const LOCALES = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
];

const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const inputClasses =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface ProfileFormProps {
  profile: ProfileUser;
  onChange: (profile: ProfileUser) => void;
}

export function ProfileForm({ profile, onChange }: ProfileFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [locale, setLocale] = useState(profile.locale);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedAvatar = avatarUrl.trim();
    if (!trimmedName) {
      setError("Display name cannot be empty.");
      return;
    }
    if (trimmedAvatar && !/^https:\/\//.test(trimmedAvatar)) {
      setError("Avatar URL must start with https://.");
      return;
    }

    setSaving(true);
    const updated = await updateProfile({
      name: trimmedName,
      bio: bio.trim(),
      avatar_url: trimmedAvatar,
      locale,
      timezone,
    });
    setSaving(false);

    if (!updated) {
      setError("Save failed. Please try again.");
      return;
    }
    onChange(updated);
    toast({ title: "Profile saved" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <label htmlFor="profile-name" className="block text-sm font-medium">
            Display name
          </label>
          <input
            id="profile-name"
            className={inputClasses}
            value={name}
            maxLength={50}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="profile-avatar" className="block text-sm font-medium">
            Avatar URL
          </label>
          <div className="flex items-center gap-3">
            <input
              id="profile-avatar"
              className={inputClasses}
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://..."
            />
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="h-9 w-9 shrink-0 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Leave empty to fall back to your Google avatar.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="profile-bio" className="block text-sm font-medium">
            Bio
          </label>
          <textarea
            id="profile-bio"
            className={`${inputClasses} h-24 resize-none py-2`}
            value={bio}
            maxLength={500}
            onChange={(event) => setBio(event.target.value)}
            placeholder="A short introduction (optional)"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="profile-locale" className="block text-sm font-medium">
              Language
            </label>
            <select
              id="profile-locale"
              className={inputClasses}
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value as ProfileUser["locale"])
              }
            >
              {LOCALES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="profile-timezone" className="block text-sm font-medium">
              Timezone
            </label>
            <select
              id="profile-timezone"
              className={inputClasses}
              value={COMMON_TIMEZONES.includes(timezone) ? timezone : "UTC"}
              onChange={(event) => setTimezone(event.target.value)}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            {!COMMON_TIMEZONES.includes(timezone) && (
              <p className="text-xs text-muted-foreground">
                Current: {timezone} (not in the list, kept as-is until changed)
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
