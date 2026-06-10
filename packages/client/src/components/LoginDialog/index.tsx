import React, { useState, useRef } from "react";
import { supabase } from "@client/lib/supabaseClient";

interface LoginDialogProps {
  visible: boolean;
  onClose: () => void;
}

type Status = "idle" | "loading" | "sent" | "verifying" | "error";

const LoginDialog: React.FC<LoginDialogProps> = ({ visible, onClose }) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", "", "", ""]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!visible) return null;

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setErrorMsg("请输入邮箱地址");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
      setCode(["", "", "", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const handleVerifyOtp = async () => {
    const token = code.join("");
    if (token.length !== 8) {
      setErrorMsg("请输入完整的8位数验证码");
      setStatus("error");
      return;
    }

    setStatus("verifying");
    setErrorMsg("");

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      handleClose();
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // 自动跳到下一个输入框
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleVerifyOtp();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleClose = () => {
    setStatus("idle");
    setEmail("");
    setCode(["", "", "", "", "", "", "", ""]);
    setErrorMsg("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-[400px] max-w-[90vw] px-6 py-8 relative">
        {/* 关闭按钮 */}
        <button
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center border-none bg-transparent text-gray-400 cursor-pointer rounded hover:bg-gray-100 hover:text-gray-600 transition-colors"
          onClick={handleClose}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* 标题 */}
        <h2 className="text-lg font-semibold text-gray-800 mb-6 text-center">
          登录
        </h2>

        {/* 邮箱输入框 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1.5">邮箱地址</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="your@email.com"
            disabled={status === "loading" || status === "verifying"}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none transition-colors focus:border-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
          />
        </div>

        {/* 验证码输入（发送成功后显示） */}
        {(status === "sent" || status === "verifying") && (
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1.5">验证码</label>
            <div className="flex gap-2 justify-center">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  disabled={status === "verifying"}
                  className="w-10 h-12 text-center text-lg font-semibold border border-gray-200 rounded-lg outline-none transition-colors focus:border-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              ))}
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {status === "error" && (
          <div className="mb-4 px-3.5 py-2.5 rounded-lg text-[13px] bg-red-50 text-red-600 border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* 已发送提示 */}
        {(status === "sent" || status === "verifying") && (
          <div className="mb-4 px-3.5 py-2.5 rounded-lg text-[13px] bg-green-50 text-green-600 border border-green-200">
            验证码已发送至 <span className="font-medium">{email}</span>
          </div>
        )}

        {/* 按钮区域 */}
        {(status === "sent" || status === "verifying") ? (
          <div className="flex gap-2.5">
            <button
              onClick={handleSendOtp}
              disabled={status === "verifying"}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 border-none rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              重新发送
            </button>
            <button
              onClick={handleVerifyOtp}
              disabled={status === "verifying"}
              className="flex-1 py-2.5 bg-indigo-500 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              {status === "verifying" ? "验证中..." : "验证"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleSendOtp}
            disabled={status === "loading"}
            className="w-full py-2.5 bg-indigo-500 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "发送中..." : "发送验证码"}
          </button>
        )}

        {/* 底部提示 */}
        <p className="mt-4 text-xs text-gray-400 text-center">
          首次使用将自动创建账号
        </p>
      </div>
    </div>
  );
};

export default LoginDialog;
