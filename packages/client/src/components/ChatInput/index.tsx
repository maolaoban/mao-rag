import React, { useState, useRef, useEffect, useCallback } from "react";
import { SvgIcon } from "../SvgIcon";
import TextareaAutosize from "react-textarea-autosize";

interface ChatInputProps {
  onSend: (question: string, isWebSearch?: boolean) => void;
  disabled: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [webSearch, setWebSearch] = useState(false);

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSend(input.trim(), webSearch);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="max-w-250 m-auto">
      <div className="w-full flex flex-col items-center gap-2.5 bg-white border border-gray-200 rounded-[14px] py-1.5 pl-4 pr-1.5 shadow-sm transition-all duration-150 focus-within:border-indigo-500 focus-within:shadow-[0_2px_12px_rgba(79,70,229,0.1)]">
        <TextareaAutosize
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入您的问题..."
          disabled={disabled}
          minRows={3}
          maxRows={8}
          className="w-full border-none outline-none text-sm text-gray-800 bg-transparent py-2 placeholder:text-gray-400 resize-none leading-normal"
        />
        <div className="w-full flex justify-between gap-2">
          <button
            onClick={() => {
              setWebSearch((v) => !v);
            }}
            title="联网搜索"
            className={`w-9 h-9 rounded-lg border-none flex items-center justify-center cursor-pointer transition-colors duration-150 shrink-0 ${
              webSearch
                ? "bg-indigo-100 text-indigo-500"
                : "bg-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
          >
            <SvgIcon name="web" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="w-10 h-10 rounded-[10px] border-none bg-indigo-500 text-white flex items-center justify-center cursor-pointer transition-colors duration-150 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed shrink-0"
          >
            <SvgIcon name="send" />
          </button>
        </div>
      </div>
      <div className="text-[11px] text-gray-400 text-center mt-1.5">
        按 Enter 发送，Shift + Enter 换行
      </div>
    </div>
  );
};

export default ChatInput;
