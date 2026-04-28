import React from "react";
import styles from "./index.module.css";
import { Streamdown } from "streamdown";

type AnswerDisplayProps = {
  content: string;
  isStreaming: boolean;
};

const AnswerDisplay: React.FC<AnswerDisplayProps> = ({
  content,
  isStreaming,
}) => {
  return (
    <div className={styles["answer-display-container"]}>
      <div className={styles["answer"]}>
        <div className={styles["answer-header"]}>
          <span className={styles["icon"]}></span>
          <strong className={styles["answer-title"]}>答：</strong>
        </div>
        <div className={styles["answer-content"]}>
          {isStreaming && !content ? (
            <span className="text-sm text-blue-400">正在思考...</span>
          ) : (
            <Streamdown isAnimating={isStreaming}>{content}</Streamdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnswerDisplay;
