import React from "react";

type SvgIconProps = {
  name: "question" | "robot" | "database" | "user" | "file" | "send" | "web";
  width?: string;
  height?: string;
  text?: string;
};

export const SvgIcon: React.FC<SvgIconProps> = ({
  name,
  width,
  height,
  text,
}) => {
  return (
    <div className="flex">
      {name === "question" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width || "20"}
          height={height || "20"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
      {name === "database" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width || "20"}
          height={height || "20"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5V19A9 3 0 0 0 21 19V5" />
          <path d="M3 12A9 3 0 0 0 21 12" />
        </svg>
      )}
      {name === "robot" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width || "20"}
          height={height || "20"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1976d2"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          data-fg-b3vm4="1.15:1.10894:/src/app/components/ChatInterface.tsx:112:13:3296:33:e:Bot::::::EI6D"
          data-fgid-b3vm4=":rb:"
        >
          <path d="M12 8V4H8"></path>
          <rect width="16" height="12" x="4" y="8" rx="2"></rect>
          <path d="M2 14h2"></path>
          <path d="M20 14h2"></path>
          <path d="M15 13v2"></path>
          <path d="M9 13v2"></path>
        </svg>
      )}
      {name === "user" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width || "20"}
          height={height || "20"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          data-fg-b3vm28="1.15:1.10894:/src/app/components/ChatInterface.tsx:207:21:6845:18:e:User::::::wpV"
          data-fgid-b3vm28=":r15:"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )}
      {name === "file" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width || "20"}
          height={height || "20"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          data-fg-dt3h34="1.16:1.6639:/src/app/components/KnowledgeBaseManager.tsx:168:23:4268:22:e:FileText::::::B1i5"
          data-fgid-dt3h34=":r55:"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
          <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
          <path d="M10 9H8"></path>
          <path d="M16 13H8"></path>
          <path d="M16 17H8"></path>
        </svg>
      )}
      {name === "send" && (
        <svg
          width={width || "20"}
          height={height || "20"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      )}
      {name === "web" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width || "20"}
          height={height || "20"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          data-fg-b3vm44="1.15:1.10894:/src/app/components/ChatInterface.tsx:279:19:9148:19:e:Globe::::::Cyd3"
          data-fgid-b3vm44=":r78:"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
          <path d="M2 12h20"></path>
        </svg>
      )}
      {text && <span className="ml-2">{text}</span>}
    </div>
  );
};
