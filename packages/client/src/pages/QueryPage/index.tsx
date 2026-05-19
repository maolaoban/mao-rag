import React, { useState, useRef, useEffect } from "react";
import ChatInput from "@client/components/ChatInput";
import AnswerDisplay from "@client/components/AnswerDisplay";
import { SvgIcon } from "@client/components/SvgIcon";

type Message = {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  sources?: string[];
};

const EXAMPLE_QUESTIONS = [
  "什么是 RAG？",
  "如何使用知识库？",
  "系统支持哪些文件格式？",
];

const QueryPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleQuery = async (question: string, isWebSearch: boolean) => {
    const userMsg: Message = { role: "user", content: question };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    const assistantMsgIndex = newMessages.length;
    const emptyAssistantMsg: Message = {
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    setMessages([...newMessages, emptyAssistantMsg]);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, webSearch: Boolean(isWebSearch) }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantMsgIndex] = {
            role: "assistant",
            content: `请求失败: ${errorData.error || "未知错误"}`,
          };
          return updated;
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          const data = line.trim();
          if (data === "[DONE]") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[assistantMsgIndex] = {
                ...updated[assistantMsgIndex],
                isStreaming: false,
              };
              return updated;
            });
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "answer") {
              fullContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantMsgIndex] = {
                  ...updated[assistantMsgIndex],
                  content: fullContent,
                };
                return updated;
              });
            } else if (parsed.type === "sources") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantMsgIndex] = {
                  ...updated[assistantMsgIndex],
                  sources: parsed.sources,
                };
                return updated;
              });
            } else if (parsed.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantMsgIndex] = {
                  role: "assistant",
                  content: `错误: ${parsed.error}`,
                  isStreaming: false,
                };
                return updated;
              });
              return;
            }
          } catch {}
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        if (updated[assistantMsgIndex]) {
          updated[assistantMsgIndex] = {
            ...updated[assistantMsgIndex],
            isStreaming: false,
          };
        }
        return updated;
      });
    } catch (err) {
      console.error("Query error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMsgIndex] = {
          role: "assistant",
          content: "请求出错，请稍后重试",
          isStreaming: false,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-8 py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">智能问答</h1>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-5 py-10 text-center">
            <div className="text-5xl mb-4">
              <SvgIcon name="robot" width="68" height="68" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              您好！我是智能问答助手
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              基于知识库的 AI 助手，随时为您解答问题
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center max-w-md">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="px-4 py-2.5 bg-white border border-gray-200 rounded-full text-[13px] text-gray-800 cursor-pointer transition-all duration-150 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50"
                  onClick={() => handleQuery(q, false)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-8 py-6 flex flex-col gap-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 bg-gray-200">
                  <SvgIcon name={msg.role === "user" ? "user" : "robot"} />
                </div>
                <div
                  className={`max-w-[75%] min-w-0 ${msg.role === "user" ? "flex flex-col items-end" : ""}`}
                >
                  {msg.role === "user" ? (
                    <div className="bg-indigo-500 text-white px-4 py-2.5 rounded-[16px_16px_4px_16px] text-sm leading-relaxed wrap-break-word">
                      {msg.content}
                    </div>
                  ) : (
                    <AnswerDisplay
                      content={msg.content}
                      isStreaming={msg.isStreaming || false}
                      sources={msg.sources}
                    />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className=" px-8 pb-6 pt-4 shrink-0 bg-[#f5f7fa]">
        <ChatInput onSend={handleQuery} disabled={isStreaming} />
      </div>
    </div>
  );
};

export default QueryPage;
