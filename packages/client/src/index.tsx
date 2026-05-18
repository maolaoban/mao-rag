import React, { useState } from "react";
import QueryPage from "@client/pages/QueryPage";
import KnowledgePage from "@client/pages/KnowledgePage";
import Sidebar from "@client/components/Sidebar";
import "./index.css";

type Page = "query" | "knowledge";

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>("query");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <main className="flex-1 min-w-0 bg-[#f5f7fa] flex flex-col overflow-hidden">
        {activePage === "query" ? <QueryPage /> : <KnowledgePage />}
      </main>
    </div>
  );
};

export default App;
