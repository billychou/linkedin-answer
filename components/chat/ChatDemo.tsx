"use client";

import ChatInput from "@/components/chat/ChatInput";
import MessageBubble from "@/components/chat/MessageBubble";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchSession } from "@/lib/authClient";
import { fetchQuota, type QuotaInfo } from "@/lib/billingClient";
import {
  appendChatMessage,
  clearChatHistory,
  fetchChatHistory,
} from "@/lib/chatClient";
import { streamChat } from "@/lib/chatAgent";
import { ChatMessage, ChatStatus } from "@/types/chat";
import { MessageCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ChatDemoProps {
  /** 是否已配置真实智能体接口（NEXT_PUBLIC_AGENT_API_URL） */
  isLive: boolean;
}

function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

export default function ChatDemo({ isLive }: ChatDemoProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  /** 实时 agent 才计配额；mock 模式不限量，保证 demo 开箱即用。 */
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isStreaming = status === "streaming";

  // Defense in depth: if the server session is gone (e.g. expired while the
  // page was open), leave for the login page instead of using the chat.
  useEffect(() => {
    void fetchSession().then((user) => {
      setSessionChecked(true);
      if (!user) window.location.replace("/login");
    });
  }, []);

  // 加载持久化的历史消息（按套餐 historyDays 裁剪）。
  useEffect(() => {
    let cancelled = false;
    void fetchChatHistory().then((history) => {
      if (cancelled || !history) return;
      setMessages((prev) =>
        prev.length === 0
          ? history.messages.map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
            }))
          : prev
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 实时 agent 模式下拉取今日配额，用于顶栏展示与发送前闸门。
  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;
    void fetchQuota().then((info) => {
      if (!cancelled) setQuota(info);
    });
    return () => {
      cancelled = true;
    };
  }, [isLive]);

  // 新消息/流式追加时自动滚动到底部（instant，避免逐 token smooth 滚动抖动）
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || status === "streaming") return;

    setError(null);
    setInput("");

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    // 发给智能体的历史 = 已有消息 + 本次用户消息（不含占位的空 assistant 消息）
    const history = [...messages, userMessage].map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setStatus("streaming");

    // Live 模式由服务端完成配额扣减与消息持久化；
    // mock 模式没有补全端点，仍走客户端持久化（失败不阻断）。
    if (!isLive) {
      void appendChatMessage("user", text);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = "";
    try {
      for await (const chunk of streamChat(history, { signal: controller.signal })) {
        accumulated += chunk;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      }
    } catch (e) {
      if (isAbortError(e)) {
        // 用户主动停止：保留已生成的部分文本
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setStatus("error");
        // 移除空的占位 assistant 消息
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.content.length === 0) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      }
    } finally {
      abortRef.current = null;
      setStatus((prev) => (prev === "streaming" ? "idle" : prev));
      if (isLive) {
        // 服务端已扣配额/落库，这里只刷新顶栏余量展示。
        void fetchQuota().then(setQuota);
      } else if (accumulated.length > 0) {
        // mock 模式：持久化 assistant 回复（失败不阻断）。
        void appendChatMessage("assistant", accumulated);
      }
    }
  }, [input, messages, status, isLive]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setStatus("idle");
    void clearChatHistory();
  }, []);

  if (!sessionChecked) {
    return null;
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border bg-card shadow-sm">
      {/* 工具栏：状态指示 + 清空会话 */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isStreaming ? "animate-pulse bg-success" : "bg-muted-foreground/40"
            )}
          />
          {isStreaming ? "Generating…" : isLive ? "Live agent" : "Mock mode"}
          {isLive && quota && (
            <span className="text-muted-foreground/70">
              · {quota.remaining}/{quota.limit} today
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={messages.length === 0}
          title="Clear conversation"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageCircle className="h-8 w-8" />
            <p className="text-sm">Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={
                isStreaming &&
                index === messages.length - 1 &&
                message.role === "assistant"
              }
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="px-4 pb-2 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {/* 输入区 */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
