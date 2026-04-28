import React, { useState } from "react";
import ChatInput from "../../components/ChatInput";
import AnswerDisplay from "../../components/AnswerDisplay";
import styles from "./index.module.css";

type Message = {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

const QueryPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const [isStreaming, setIsStreaming] = useState(false);

  const handleQuery = async (question: string) => {
    // Add user message
    const userMsg: Message = { role: "user", content: question };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    // Create placeholder for assistant answer
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
        body: JSON.stringify({ question }),
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

      // Handle end of stream
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
    <div className={styles["query-page"]}>
      <div className={styles["messages-list"]}>
        {messages.map((msg, idx) => (
          <div key={idx} className={styles["message-item"]}>
            {msg.role === "user" && (
              <div className={styles["user-message"]}>问：{msg.content}</div>
            )}
            {msg.role === "assistant" && (
              <AnswerDisplay
                content={msg.content}
                isStreaming={msg.isStreaming || false}
              />
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <div className={styles["empty-state"]}>请输入您想查询的问题</div>
        )}
      </div>
      <div className={styles["chat-input-wrapper"]}>
        <ChatInput onSend={handleQuery} disabled={isStreaming} />
      </div>
    </div>
  );
};

export default QueryPage;
