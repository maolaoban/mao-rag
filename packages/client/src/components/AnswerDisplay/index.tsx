import React from "react";
import { Streamdown } from "streamdown";

type AnswerDisplayProps = {
  content: string;
  isStreaming: boolean;
  sources?: string[];
  statusMessage?: string;
};

const AnswerDisplay: React.FC<AnswerDisplayProps> = ({
  content,
  isStreaming,
  sources,
  statusMessage,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-[16px_16px_16px_4px] px-4.5 py-3.5 text-sm leading-[1.7] text-gray-800 wrap-break-word">
      <div className="min-h-5">
        {isStreaming && !content ? (
          <span className="text-indigo-500 text-[13px]">{statusMessage || '正在思考...'}</span>
        ) : (
          <Streamdown isAnimating={isStreaming}>{content}</Streamdown>
        )}
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-500">📎 来源：</span>
          {sources.map((s, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 bg-gray-100 rounded text-gray-500"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnswerDisplay;
