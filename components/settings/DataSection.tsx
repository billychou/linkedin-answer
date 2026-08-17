"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteMyAccount, exportMyData } from "@/lib/billingClient";
import { Download, TriangleAlert } from "lucide-react";
import { useCallback, useState } from "react";

/**
 * 数据与隐私 Tab（GDPR 合规）：
 * - 一键导出账号全部数据（JSON 下载）
 * - 注销账号（需输入 DELETE 二次确认；软删除 + PII 匿名化）
 */
export function DataSection() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    const ok = await exportMyData();
    setExporting(false);
    if (!ok) {
      toast({
        title: "Export failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    const result = await deleteMyAccount();
    setDeleting(false);
    if (result.ok) {
      toast({
        title: "Account deleted",
        description: "Your data has been anonymized. Goodbye!",
      });
      window.location.href = "/";
      return;
    }
    toast({
      title: "Could not delete account",
      description: result.error ?? "Please try again later.",
      variant: "destructive",
    });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-3">
        <p className="text-sm font-medium">Export your data</p>
        <p className="text-xs text-muted-foreground">
          Download everything associated with your account: profile, tenants,
          subscriptions, invoices, and usage history — as a JSON file.
        </p>
        <Button size="sm" variant="outline" onClick={() => void handleExport()} disabled={exporting}>
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Preparing…" : "Download my data"}
        </Button>
      </div>

      <div className="rounded-lg border border-destructive/50 bg-card p-6 shadow-sm space-y-3">
        <p className="text-sm font-medium text-destructive">Delete account</p>
        <p className="text-xs text-muted-foreground">
          Permanently anonymizes your profile, removes your sign-in
          identities, and leaves your tenants. This cannot be undone.
        </p>

        {!confirmOpen ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            Delete my account…
          </Button>
        ) : (
          <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <TriangleAlert className="h-4 w-4" />
              Type <strong>DELETE</strong> below to confirm.
            </p>
            <input
              type="text"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={confirmation.trim() !== "DELETE" || deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmation("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
