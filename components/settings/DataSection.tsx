"use client";

export function DataSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-3">
        <p className="text-sm font-medium">Export your data</p>
        <p className="text-xs text-muted-foreground">
          Download everything associated with your account. Coming soon.
        </p>
      </div>

      <div className="rounded-lg border border-destructive/50 bg-card p-6 shadow-sm space-y-3">
        <p className="text-sm font-medium text-destructive">Delete account</p>
        <p className="text-xs text-muted-foreground">
          Permanently delete your account and associated data. Coming soon.
        </p>
      </div>
    </div>
  );
}
