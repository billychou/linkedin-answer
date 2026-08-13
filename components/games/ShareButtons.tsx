"use client";

import { useToast } from "@/hooks/use-toast";
import { Check, Link2, Linkedin, Twitter } from "lucide-react";
import { useState } from "react";

export default function ShareButtons() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({ title: "Link copied!", description: "Page link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", description: "Please copy the URL manually", variant: "destructive" });
    }
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(document.title)}&url=${encodeURIComponent(window.location.href)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold transition hover:bg-muted";

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={copyLink} className={btn}>
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Link2 className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <button onClick={shareTwitter} className={btn} aria-label="Share on X">
        <Twitter className="h-3.5 w-3.5" /> Post
      </button>
      <button onClick={shareLinkedIn} className={btn} aria-label="Share on LinkedIn">
        <Linkedin className="h-3.5 w-3.5" /> Share
      </button>
    </div>
  );
}
