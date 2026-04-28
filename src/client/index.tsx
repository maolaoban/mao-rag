import React, { useState } from "react";
import QueryPage from "./pages/QueryPage";
import KnowledgePage from "./pages/KnowledgePage";
import "./index.css";

type Tab = "query" | "knowledge";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("query");

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">MAO-RAG 知识库问答系统</h1>
        <nav className="nav">
          <div
            className={`tab ${activeTab === "query" ? "tabActive" : ""}`}
            onClick={() => setActiveTab("query")}
          >
            智能问答
          </div>
          <div
            className={`tab ${activeTab === "knowledge" ? "tabActive" : ""}`}
            onClick={() => setActiveTab("knowledge")}
          >
            知识库管理
          </div>
        </nav>
      </header>
      <main className="main">
        {activeTab === "query" ? <QueryPage /> : <KnowledgePage />}
      </main>
    </div>
  );
};

export default App;
