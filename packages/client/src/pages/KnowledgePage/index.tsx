import React, { useState, useEffect } from "react";
import type { KnowledgeFile } from "mao-rag-shared";
import { SvgIcon } from "@client/components/SvgIcon";

type ImportMethod = "url" | "upload";

const KnowledgePage: React.FC = () => {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
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

  const totalChunks = files.reduce((sum, f) => sum + f.chunks, 0);

  const statusClasses = {
    running: "bg-blue-50 text-blue-500 border border-blue-200",
    success: "bg-green-50 text-green-600 border border-green-200",
    error: "bg-red-50 text-red-600 border border-red-200",
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-8 py-5 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">知识库管理</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">
        {/* Import Card */}
        <div className="bg-white rounded-xl px-6 py-5 shadow-sm">
          <div className="text-[15px] font-semibold text-gray-800 mb-4">
            📥 导入知识
          </div>
          <div className="flex gap-2 mb-3.5">
            <button
              className={`px-4 py-2 border rounded-lg text-[13px] cursor-pointer transition-all duration-150 ${
                importMethod === "url"
                  ? "bg-indigo-500 border-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-transparent border-gray-200 text-gray-500 hover:border-indigo-500 hover:text-indigo-500"
              }`}
              onClick={() => setImportMethod("url")}
            >
              🔗 URL 导入
            </button>
            <button
              className={`px-4 py-2 border rounded-lg text-[13px] cursor-pointer transition-all duration-150 ${
                importMethod === "upload"
                  ? "bg-indigo-500 border-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-transparent border-gray-200 text-gray-500 hover:border-indigo-500 hover:text-indigo-500"
              }`}
              onClick={() => setImportMethod("upload")}
            >
              文件上传
            </button>
          </div>

          {importMethod === "url" ? (
            <div className="flex gap-2.5">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/document.md"
                disabled={importing}
                className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none transition-colors duration-150 focus:border-indigo-500"
              />
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-5 py-2.5 text-indigo-500 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {importing ? "导入中..." : "导入"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2.5">
              <label className="flex-1 p-3 border-2 border-dashed border-gray-200 rounded-lg text-center cursor-pointer text-[13px] text-gray-500 transition-colors duration-150 hover:border-indigo-500">
                {selectedFiles
                  ? `已选择 ${selectedFiles.length} 个文件`
                  : "点击选择文件，或拖拽文件到这里"}
                <input
                  type="file"
                  multiple
                  accept=".md,.txt,.json,.csv,.html"
                  onChange={handleUpload}
                  disabled={importing}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleImportUpload}
                disabled={importing || !selectedFiles}
                className="px-5 py-2.5 text-indigo-500 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed whitespace-nowrap"
              >
                上传导入
              </button>
            </div>
          )}

          {importStatus.status !== "idle" && (
            <div
              className={`mt-3 px-3.5 py-2.5 rounded-lg text-[13px] ${statusClasses[importStatus.status as keyof typeof statusClasses] || ""}`}
            >
              {importStatus.message}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 text-center shadow-sm">
            <div className="text-2xl font-bold text-indigo-500 mb-1">
              {files.length}
            </div>
            <div className="text-[13px] text-gray-500">文件</div>
          </div>
          <div className="bg-white rounded-xl p-5 text-center shadow-sm">
            <div className="text-2xl font-bold text-indigo-500 mb-1">
              {totalChunks}
            </div>
            <div className="text-[13px] text-gray-500">文档块</div>
          </div>
          <div className="bg-white rounded-xl p-5 text-center shadow-sm">
            <div className="text-2xl font-bold text-indigo-500 mb-1">
              {importing ? "1" : "0"}
            </div>
            <div className="text-[13px] text-gray-500">导入中</div>
          </div>
        </div>

        {/* File List */}
        <div className="bg-white rounded-xl px-6 py-5 shadow-sm">
          {loading ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              加载中...
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              暂无文件，请先导入知识文件
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3.5 py-2.5 text-left text-[13px] font-semibold text-gray-500 border-b border-gray-200">
                    文件名
                  </th>
                  <th className="px-3.5 py-2.5 text-left text-[13px] font-semibold text-gray-500 border-b border-gray-200">
                    文档块数
                  </th>
                  <th className="px-3.5 py-2.5 text-left text-[13px] font-semibold text-gray-500 border-b border-gray-200">
                    上传时间
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr
                    key={file.name}
                    className="hover:bg-indigo-50/2 transition-colors"
                  >
                    <td className="px-3.5 py-3 text-sm text-gray-800 border-b border-gray-100">
                      <SvgIcon
                        name="file"
                        text={decodeURIComponent(file.name)}
                      />
                    </td>
                    <td className="px-3.5 py-3 text-sm text-gray-800 border-b border-gray-100">
                      {file.chunks}
                    </td>
                    <td className="px-3.5 py-3 text-sm text-gray-800 border-b border-gray-100">
                      {file.uploadedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgePage;
