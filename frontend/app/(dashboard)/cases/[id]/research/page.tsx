"use client";

import { use, useState, useRef, useEffect } from "react";
import { streamAI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTED = [
  "What relief has the petitioner sought?",
  "Summarise the respondent's key defences",
  "What evidence has been placed on record?",
  "Are there any precedents cited by the parties?",
  "What sections of CPC are applicable here?",
];

export default function ResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    const assistantMsg: Message = { role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      for await (const chunk of streamAI("research", { case_id: id, question })) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Research request failed");
    } finally {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false };
        return updated;
      });
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3">
        <h2 className="text-lg font-semibold">Legal Research</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ask questions about the case documents. The AI searches uploaded files and cites applicable Indian law.
        </p>
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="px-6 pb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="text-xs border rounded-full px-3 py-1.5 hover:bg-muted transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                {msg.content}
                {msg.streaming && <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />}
              </pre>
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 h-7 w-7 rounded-full bg-secondary border flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4">
        <form
          onSubmit={(e) => { e.preventDefault(); ask(input); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the case, parties, evidence, applicable law..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()} size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
