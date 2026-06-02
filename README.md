# MaoRAG — 智能知识库问答系统

基于 LangChain + LangGraph + Supabase pgvector 的 Naive RAG 应用。支持混合检索（向量语义 + 全文关键词）、查询改写、联网搜索，流式输出 AI 回答。

## 特性

- **混合检索** — 结合向量语义搜索（cosine similarity）与全文关键词搜索（pg_trgm），使用 RRF 算法融合排序
- **查询改写** — LLM 将用户问题自动改写为 3 个不同角度的搜索查询，提升召回多样性
- **联网搜索** — 可选 Bocha 联网搜索，补足知识库未覆盖的信息
- **流式输出** — SSE 实时推送回答内容和执行状态（改写中 → 检索中 → 生成中）
- **知识库管理** — 支持 Markdown 文件上传和 URL 导入，自动分块存储

## 架构

```
浏览器 (Vite :3000)
  │
  │  POST /api/query      (SSE 流式)
  │  /api/knowledge/*     (REST JSON)
  ▼
Hono Server (:4000)
  │
  ├── LangGraph 工作流
  │     START → rewriteQueries(查询改写) → retrieve(混合检索)
  │                                         │            │
  │                                    isWebSearch?    直接回答
  │                                         │            │
  │                                    webSearch    generate(LLM生成)
  │                                         │            │
  │                                         └────┬───────┘
  │                                              ▼
  │                                      流式输出回答
  │
  └── Supabase pgvector
        ├── documents 表（向量 + 全文）
        └── hybrid_search 函数（RRF 融合检索）
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 10
- Supabase 项目（已开启 pgvector 扩展）

### 安装

```bash
pnpm install
```

### 配置

复制 `.env.example` 为 `.env`，填写以下配置：

```bash
# 服务端口
CLIENT_PORT=3000
SERVER_PORT=4000

# LLM 配置
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=your_base_url
MODEL_NAME=your_model

# Supabase
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Embedding 配置
EMBEDDING_MODEL_NAME=text-embedding-v3
EMBEDDING_DIMENSIONS=1024
EMBEDDING_BASE_URL=your_embedding_url
EMBEDDING_API_KEY=your_embedding_key
```

### Supabase 数据库初始化

在 Supabase SQL Editor 中执行以下操作：

**1. 启用扩展**

```sql
create extension if not exists vector;
create extension if not exists pg_trgm;
```

**2. 创建表**

```sql
create table documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1024),
  uploaded_at timestamp with time zone default now()
);
```

**3. 创建混合检索函数** — 通过 Supabase Migration 管理（服务启动后项目会自动检测），或手动在 SQL Editor 执行 `hybrid_search` 函数。

### 启动

```bash
# 开发模式（同时启动前后端）
pnpm dev

# 仅启动后端
pnpm dev:server

# 仅启动前端
pnpm dev:client
```

前端运行在 `http://localhost:3000`，请求自动代理到后端 `http://localhost:4000`。

## 使用指南

### 智能问答

1. 在左侧导航选择「智能问答」
2. 输入问题，按 Enter 发送
3. 可点击 🌐 按钮开启联网搜索
4. 等待回答流式输出，状态栏显示当前执行阶段

### 知识库管理

1. 在左侧导航选择「知识库管理」

**URL 导入**：粘贴文件 URL，点击导入

**文件上传**：拖拽或选择 Markdown 文件上传（仅支持 `.md`）

文件会自动分块（1000 字符/块，200 字符重叠），生成向量后存入 Supabase。导入期间会轮询显示进度。

## 项目结构

```
mao-rag/
├── packages/
│   ├── client/                  # React 19 前端
│   │   └── src/
│   │       ├── components/      # 通用组件
│   │       │   ├── Sidebar/     # 左侧导航
│   │       │   ├── ChatInput/   # 输入框（多行、联网切换）
│   │       │   ├── AnswerDisplay/  # 流式 Markdown 渲染
│   │       │   └── SvgIcon/     # 图标组件
│   │       └── pages/
│   │           ├── QueryPage/   # 智能问答页
│   │           └── KnowledgePage/  # 知识库管理页
│   ├── server/                  # Hono 后端
│   │   └── src/
│   │       ├── index.ts         # 入口：Hono 服务、CORS
│   │       ├── config.ts        # 配置：LLM、Embeddings、Supabase
│   │       ├── rag.ts           # LangGraph 工作流定义
│   │       ├── vector.ts        # 文档处理：分块、向量化存储
│   │       └── routes/
│   │           ├── query.ts     # POST /api/query — 流式问答
│   │           └── knowledge.ts # /api/knowledge/* — 知识库管理
│   └── shared/                  # 共享类型定义
├── .env.example                 # 环境变量模板
├── package.json                 # 根 monorepo 配置
├── pnpm-workspace.yaml
└── tsconfig.json
```

## 技术栈

| 层 | 技术 |
|---|---|
| 包管理 | pnpm workspaces |
| 语言 | TypeScript 5.9 |
| 前端 | React 19 / Vite 8 / TailwindCSS 4 |
| 后端 | Hono 4 |
| AI 框架 | LangChain / LangGraph |
| 向量存储 | Supabase pgvector |
| 文本分块 | MarkdownTextSplitter (1000/200) |
| 流式渲染 | streamdown |
| 可观测性 | LangSmith |

## 混合检索原理

`hybrid_search` 是 Supabase 中的 PostgreSQL RPC 函数，使用双重检索 + RRF 融合：

1. **语义路**：`embedding <=> query_embedding` 余弦距离，取 top (k×3) 候选
2. **关键词路**：`pg_trgm.similarity()` 三元组文本匹配，过滤相似度 > 0.05 的候选
3. **RRF 融合**：`score = 1/(rank_semantic + 60) + 1/(rank_text + 60)`，按融合分降序取 top k

相比纯向量检索，混合检索能更好地处理术语、缩写等语义模型难以泛化的查询。
