# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Naive RAG (Retrieval-Augmented Generation)** application built with LangChain, LangGraph, and Supabase vector store. It retrieves relevant documents from a Supabase pgvector database and uses an LLM to generate answers based on the retrieved context.

## Key Files

- **`naive-rag.mjs`** — Main (and only) source file. Contains the full RAG pipeline.
- **`.env`** — Environment configuration for OpenAI-compatible APIs and Supabase.
- **`package.json`** — Dependencies managed via pnpm.

## Architecture

The app uses a **LangGraph StateGraph** with two nodes:

1. **`retrieve`** — Calls Supabase `match_documents` function via `vectorStore.similaritySearch()` to find top-k relevant documents.
2. **`generate`** — Builds a prompt from retrieved document content and streams an LLM response back to the user.

Flow: `START → retrieve → generate → END`

### Pipeline Details

- **Embeddings**: Uses Alibaba Cloud (dashscope) `text-embedding-v3` with 1024 dimensions via `OpenAIEmbeddings` (compatible mode).
- **LLM**: Uses aitechflux API via `ChatOpenAI`.
- **Vector Store**: Supabase with pgvector, using cosine similarity (`<=>` operator in SQL function `match_documents`).
- **Top-K**: Default 3 documents retrieved per query.

## Running

```bash
node naive-rag.mjs
```

No build step or test framework needed. This is a plain ESM script.

## Supabase Setup

The `documents` table in Supabase must be created with:

```sql
create extension vector;

create table documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1024)
);

create or replace function match_documents (
  query_embedding vector(1024),
  match_count int default null,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
) language plpgsql as $
#variable_conflict use_column
begin
  return query
  select id, content, metadata, 1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$;
```

**Important**: Embedding dimensions must match the `.env` value (`EMBEDDING_DIMENSIONS=1024`). Mismatch causes API errors.

## Common Issues

- **Embedding dimension mismatch**: If `vector(N)` in SQL doesn't match `EMBEDDING_DIMENSIONS`, the API returns a 400 error.
- **RSP (Row Security Policy)**: Use the Service Role Key (`SUPABASE_SERVICE_KEY`) for write operations, not the Publishable Key.
- **Embeddings undefined response**: Ensure `OpenAIEmbeddings` is configured with the correct `baseURL` and `apiKey` (not using defaults).
- **batchResponse length mismatch**: API may return fewer embeddings than input texts (e.g., filtered empty strings). This causes index-out-of-range errors.

## Configuration

| Env Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | LLM API credentials |
| `MODEL_NAME` | LLM model identifier |
| `EMBEDDING_API_KEY` / `EMBEDDING_BASE_URL` / `EMBEDDING_MODEL_NAME` / `EMBEDDING_DIMENSIONS` | Embedding API credentials |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Supabase vector store connection |
