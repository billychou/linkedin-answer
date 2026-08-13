import ChatDemo from "@/components/chat/ChatDemo";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
  page: "Chat",
  title: "AI Chat Demo",
  description:
    "Demo page for testing the agent frontend chat box: SSE streaming output, stop generation, and multi-turn conversation.",
  path: `/chat`,
  canonicalUrl: `/chat`,
  noIndex: true,
});

// 静态导出下 NEXT_PUBLIC_* 在构建时内联：切换 Mock / Live 模式需重新构建
const isLive = Boolean(process.env.NEXT_PUBLIC_AGENT_API_URL);

export default function ChatPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            AI Chat Demo
          </h1>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              isLive
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Bot className="h-3.5 w-3.5" />
            {isLive ? "Live agent" : "Mock mode"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {isLive
            ? "Connected to the configured agent API (NEXT_PUBLIC_AGENT_API_URL)."
            : "No agent API configured — replies are mocked locally. Set NEXT_PUBLIC_AGENT_API_URL to connect a real agent."}
        </p>
      </div>

      <ChatDemo isLive={isLive} />
    </div>
  );
}
