"use client";

import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types/chat";
import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
  /** 该消息是否为正在流式生成中的 assistant 消息 */
  isStreaming: boolean;
}

/** 三个跳动点，表示智能体正在生成 */
function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Generating">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.1s]" />
    </span>
  );
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const showTyping = !isUser && isStreaming && message.content.length === 0;

  return (
    <div className={cn("flex items-start gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isUser
            ? "ml-auto bg-primary text-primary-foreground"
            : "mr-auto bg-muted text-foreground"
        )}
      >
        {showTyping ? <TypingIndicator /> : message.content}
      </div>
    </div>
  );
}
