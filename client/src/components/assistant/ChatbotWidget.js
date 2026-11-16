"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { apiRequest } from "@/lib/api";

const WELCOME_MESSAGE = {
  id: "welcome-1",
  role: "assistant",
  content:
    "🌿 **Namaste! I am Sprout, your Soil & Soul botanical companion.**\n\nI can help you diagnose plant issues, recommend varieties for low light or pet-friendly homes, advise on living soils, and answer questions about our plastic-free delivery.\n\nWhat can I help you grow today?",
  quickReplies: [
    "🌿 Beginner indoor plants",
    "🍂 Why are leaves turning yellow?",
    "☀️ Best low-light plants",
    "🐾 Pet-friendly houseplants",
    "📦 Plastic-free shipping info",
  ],
  suggestedProducts: [],
};

let msgCounter = 1;
function generateMessageId(role) {
  msgCounter += 1;
  return `${role}-${msgCounter}`;
}

function loadInitialMessages() {
  if (typeof window === "undefined") return [WELCOME_MESSAGE];
  try {
    const saved = sessionStorage.getItem("soil_soul_chat_history");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return [WELCOME_MESSAGE];
}

function formatText(text, isUser = false) {
  if (!text) return null;
  const lines = text.split("\n");
  const textColor = isUser ? "text-white" : "text-body";
  const strongColor = isUser ? "text-white" : "text-ink";
  const inlineStyle = isUser ? { color: "#ffffff" } : undefined;

  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const formattedParts = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} className={`font-semibold ${strongColor}`} style={inlineStyle}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (line.trim().startsWith("•")) {
      return (
        <li
          key={idx}
          className={`ml-3.5 list-disc text-sm ${textColor} leading-relaxed my-0.5`}
          style={inlineStyle}
        >
          {formattedParts}
        </li>
      );
    }
    return (
      <p
        key={idx}
        className={`my-1 text-sm ${textColor} leading-relaxed last:mb-0 first:mt-0 whitespace-pre-wrap`}
        style={inlineStyle}
      >
        {formattedParts}
      </p>
    );
  });
}

export default function ChatbotWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(loadInitialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Save messages to session storage when messages update
  useEffect(() => {
    if (messages.length > 1) {
      try {
        sessionStorage.setItem("soil_soul_chat_history", JSON.stringify(messages));
      } catch {
        // Ignore quota errors
      }
    }
  }, [messages]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Hide entirely on admin routes (unconditionally placed after all hooks)
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: generateMessageId("user"),
      role: "user",
      content: text,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputValue("");
    setIsLoading(true);

    try {
      const apiHistory = newHistory.slice(1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiRequest("/assistant/chat", {
        method: "POST",
        body: { message: text, history: apiHistory },
      });

      const assistantMsg = {
        id: generateMessageId("assistant"),
        role: "assistant",
        content: res.reply,
        suggestedProducts: res.suggestedProducts || [],
        quickReplies: res.quickReplies || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) setHasUnread(true);
    } catch {
      const fallbackMsg = {
        id: generateMessageId("assistant"),
        role: "assistant",
        content:
          "I am having a brief moment of soil connection loss, but remember: healthy soil with good drainage and bright, indirect light will keep most houseplants thriving! Check out our shop catalog or try asking again in a moment.",
        suggestedProducts: [],
        quickReplies: ["Suggest beginner plants", "Why are leaves yellow?"],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    try {
      sessionStorage.removeItem("soil_soul_chat_history");
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <>
      {/* ─── Floating Trigger Button ────────────────────────────────────────── */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setHasUnread(false);
            }}
            aria-label="Open Sprout Botanical Assistant"
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-forest text-cream shadow-[0_8px_24px_rgba(36,69,42,0.35)] transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest cursor-pointer"
          >
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
              </span>
            )}
            <Icon name="sprout" size={26} className="transition-transform group-hover:rotate-12 duration-200" />
            <span className="sr-only">Chat with botanical assistant Sprout</span>
          </button>
        </div>
      )}

      {/* ─── Chat Window ────────────────────────────────────────────────────── */}
      {isOpen && (
        <aside
          role="dialog"
          aria-label="Sprout Botanical AI Assistant"
          className="fixed bottom-5 right-5 z-50 flex h-[560px] max-h-[85vh] w-[92vw] sm:w-[395px] flex-col overflow-hidden rounded-3xl border border-line bg-[#faf8f2] shadow-[0_16px_48px_rgba(27,42,28,0.22)] animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#24452a] px-4 py-3.5 text-[#faf8f2]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-50 text-forest shadow-inner">
                <Icon name="sprout" size={20} />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#24452a]" />
              </div>
              <div className="min-w-0 truncate">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-cream truncate m-0">Sprout</h2>
                  <span className="rounded-full bg-emerald-900/60 px-1.5 py-0.2 text-[10px] font-medium text-emerald-300">
                    AI Online
                  </span>
                </div>
                <p className="text-[11px] text-sage-100/80 truncate m-0">Soil &amp; Soul Botanical Concierge</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-cream/90 hover:bg-white/20 transition-colors cursor-pointer border-0"
              >
                <Icon name="refresh" size={14} />
                <span className="sr-only">Clear conversation</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-cream/90 hover:bg-white/20 transition-colors cursor-pointer border-0"
              >
                <Icon name="x" size={16} />
                <span className="sr-only">Close chat</span>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} space-y-1.5`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm ${
                    msg.role === "user"
                      ? "bg-forest text-white rounded-br-xs"
                      : "bg-white border border-line text-ink rounded-bl-xs"
                  }`}
                  style={msg.role === "user" ? { color: "#ffffff" } : undefined}
                >
                  {formatText(msg.content, msg.role === "user")}
                </div>

                {/* Suggested Products Cards */}
                {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                  <div className="w-full max-w-[90%] space-y-2 mt-1">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      🌿 Recommended Botanicals
                    </p>
                    {msg.suggestedProducts.map((p) => (
                      <Link
                        key={p.id || p.slug}
                        href={`/products/${p.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl bg-white border border-line hover:border-forest/50 hover:shadow-xs transition-all no-underline text-ink group"
                      >
                        {p.image ? (
                          <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-sand/30">
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              sizes="48px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-sage-50 text-forest flex items-center justify-center shrink-0">
                            <Icon name="sprout" size={20} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-medium text-forest block truncate">
                            {p.categoryName || "Store Item"}
                          </span>
                          <h4 className="text-xs font-semibold text-ink truncate m-0 group-hover:text-forest transition-colors">
                            {p.name}
                          </h4>
                          <span className="text-xs font-bold text-ink">₹{p.price}</span>
                        </div>
                        <span className="text-xs text-forest font-medium shrink-0 pr-1 group-hover:translate-x-0.5 transition-transform">
                          View →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Quick Reply Chips */}
                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.quickReplies.map((qr) => (
                      <button
                        key={qr}
                        type="button"
                        onClick={() => handleSend(qr)}
                        className="px-2.5 py-1 rounded-full bg-white border border-line text-xs font-medium text-forest hover:bg-forest/10 hover:border-forest/40 transition-colors cursor-pointer"
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-1.5 bg-white border border-line rounded-2xl px-3.5 py-2.5 w-fit text-muted shadow-xs">
                <span className="text-xs text-forest font-medium">Sprout is thinking</span>
                <span className="flex items-center gap-1 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-forest animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-forest animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-forest animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-line bg-white"
          >
            <div className="flex items-center gap-2 rounded-full border border-line bg-sand/30 px-3.5 py-1.5 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                maxLength={300}
                placeholder="Ask about plant care, soil, tools..."
                disabled={isLoading}
                className="w-full bg-transparent text-sm text-ink placeholder:text-muted outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                aria-label="Send message"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-cream disabled:opacity-40 hover:bg-forest-dark transition-colors cursor-pointer border-0"
              >
                <Icon name="arrow-right" size={15} />
              </button>
            </div>
            <p className="m-0 mt-1.5 text-center text-[10px] text-muted">
              Sprout provides botanical care advice based on Soil &amp; Soul catalogue.
            </p>
          </form>
        </aside>
      )}
    </>
  );
}
