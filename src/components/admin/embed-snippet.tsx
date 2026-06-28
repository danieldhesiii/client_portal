"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shows the ready-to-paste tracking snippet for a site, with a copy button. */
export function EmbedSnippet({
  publicId,
  appUrl,
}: {
  publicId: string;
  appUrl: string;
}) {
  const snippet = `<script defer data-site="${publicId}" src="${appUrl}/tracker.js"></script>`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the code is still visible to copy manually */
    }
  }

  return (
    <div className="rounded-md border border-border bg-muted/50">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Embed snippet</span>
        <Button size="sm" variant="ghost" onClick={copy} className="h-7 gap-1.5">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}
