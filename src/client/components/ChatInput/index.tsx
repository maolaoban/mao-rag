import React, { useState } from "react";
import styles from "./index.module.css";

interface ChatInputProps {
  onSend: (question: string) => void;
  disabled: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles["container"]}>
      <div className={styles["input-wrapper"]}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入您的问题...，按 Enter 发送问题"
          disabled={disabled}
          className={styles["input"]}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className={styles.button}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
