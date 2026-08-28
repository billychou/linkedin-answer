import ChatDemo from "@/components/chat/ChatDemo";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
  page: "Chat",
  title: "AI Assistant",
  description:
    "Chat with our AI assistant about LinkedIn daily puzzle games: get hints, strategies and explanations for Pinpoint, Queens, Tango, Zip, Crossclimb, Patches and Mini Sudoku.",
  path: `/chat`,
  canonicalUrl: `/chat`,
  noIndex: true,
});

// 默认走本站服务端补全端点（/api/chat/completions）；
// NEXT_PUBLIC_AGENT_API_URL="mock" 时为本地模拟。静态导出下切换需重新构建。
const isLive = process.env.NEXT_PUBLIC_AGENT_API_URL !== "mock";

export default function ChatPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            AI Assistant
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
            {isLive ? "Live" : "Mock mode"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {isLive
            ? "Ask for hints and strategies on today's LinkedIn puzzles. Usage counts against your plan's daily chat quota."
            : "No agent backend configured — replies are mocked locally. Set NEXT_PUBLIC_AGENT_API_URL to connect a real agent."}
        </p>
      </div>

      <ChatDemo isLive={isLive} />
    </div>
  );
}
