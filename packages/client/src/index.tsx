import React, { useState } from "react";
import QueryPage from "@client/pages/QueryPage";
import KnowledgePage from "@client/pages/KnowledgePage";
import Sidebar from "@client/components/Sidebar";
import LoginDialog from "@client/components/LoginDialog";
import { AuthProvider } from "@client/context/AuthContext";
import "./index.css";

type Page = "query" | "knowledge";

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>("query");
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        onLoginClick={() => setShowLogin(true)}
      />
      <main className="flex-1 min-w-0 bg-[#f5f7fa] flex flex-col overflow-hidden">
        {activePage === "query" ? (
          <QueryPage />
        ) : (
          <KnowledgePage onLoginClick={() => setShowLogin(true)} />
        )}
      </main>
      <LoginDialog visible={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
