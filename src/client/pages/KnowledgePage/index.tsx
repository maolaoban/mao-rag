import React, { useState, useEffect } from "react";
import { KnowledgeFile as KnowledgeFileType } from "../../types";
import styles from "./index.module.css";

type ImportMethod = "url" | "upload";

const KnowledgePage: React.FC = () => {
  const [files, setFiles] = useState<KnowledgeFileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    status: "idle" | "running" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });

  const [importMethod, setImportMethod] = useState<ImportMethod>("url");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/knowledge/files");
      const data = await response.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Poll import status
  useEffect(() => {
    if (importing) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch("/api/knowledge/import-status");
          const data = await response.json();
          setImportStatus(data);
          if (data.status === "success" || data.status === "error") {
            clearInterval(interval);
            setImporting(false);
            await fetchFiles();
          }
        } catch (err) {
          console.error("Failed to fetch import status:", err);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [importing]);

  const handleImportUrl = async () => {
    if (!urlInput.trim()) {
      setImportStatus({ status: "error", message: "请输入有效的 URL" });
      return;
    }
    setImporting(true);
    setImportStatus({ status: "running", message: "从 URL 导入中..." });
    try {
      await fetch("/api/knowledge/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
    } catch (err) {
      console.error("Import failed:", err);
      setImportStatus({ status: "error", message: (err as Error).message });
      setImporting(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setSelectedFiles(files);
  };

  const handleImportUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setImportStatus({ status: "error", message: "请选择要上传的文件" });
      return;
    }
    setImporting(true);
    setImportStatus({ status: "running", message: "上传导入中..." });
    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("files", selectedFiles[i]);
      }
      await fetch("/api/knowledge/import-upload", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("Upload failed:", err);
      setImportStatus({ status: "error", message: (err as Error).message });
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (importMethod === "url") {
      await handleImportUrl();
    } else {
      await handleImportUpload();
    }
  };

  return (
    <div className={styles["knowledge-page"]}>
      <div className={styles.content}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
            知识库文件
          </h2>
        </div>

        {/* Import section */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              padding: "16px",
              backgroundColor: "#fff",
              borderRadius: "8px",
              border: "1px solid #e8e8e8",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontWeight: 600, fontSize: "14px" }}>导入方式</span>
              <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    checked={importMethod === "url"}
                    onChange={() => setImportMethod("url")}
                  />
                  从 URL 导入
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    checked={importMethod === "upload"}
                    onChange={() => setImportMethod("upload")}
                  />
                  从本地文件上传
                </label>
              </div>
            </div>

            {importMethod === "url" ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/document.md"
                  disabled={importing}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid #d9d9d9",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
                <button
                  onClick={handleImport}
                  disabled={importing}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: importing ? "#91d5ff" : "#1677ff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: importing ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {importing ? "导入中..." : "导入"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "2px dashed #d9d9d9",
                    borderRadius: "6px",
                    textAlign: "center",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#999",
                  }}
                >
                  {selectedFiles
                    ? `已选择 ${selectedFiles.length} 个文件`
                    : "点击选择文件，或拖拽文件到这里"}
                  <input
                    type="file"
                    multiple
                    accept=".md,.txt,.json,.csv,.html"
                    onChange={handleUpload}
                    disabled={importing}
                    style={{ display: "none" }}
                  />
                </label>
                <button
                  onClick={handleImportUpload}
                  disabled={importing || !selectedFiles}
                  style={{
                    padding: "8px 16px",
                    backgroundColor:
                      importing || !selectedFiles ? "#91d5ff" : "#1677ff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor:
                      importing || !selectedFiles ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  上传导入
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status message */}
        {importStatus.status !== "idle" && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "6px",
              border: "1px solid",
              marginBottom: "16px",
              fontSize: "14px",
              backgroundColor:
                importStatus.status === "error" ? "#fff2e8" : "#f6ffed",
              borderColor:
                importStatus.status === "error" ? "#ffbb96" : "#b7eb8f",
              color: importStatus.status === "error" ? "#d4380d" : "#389e0d",
            }}
          >
            {importStatus.message}
          </div>
        )}

        {/* File list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#999" }}>加载中...</div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#999" }}>暂无文件，请先导入知识文件</div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "#fff",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#333",
                  }}
                >
                  文件名
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#333",
                  }}
                >
                  文档块数
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#333",
                  }}
                >
                  上传时间
                </th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.name}>
                  <td
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #f0f0f0",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    {file.name}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #f0f0f0",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    {file.chunks}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #f0f0f0",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    {file.uploadedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default KnowledgePage;
