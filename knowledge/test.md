# 测试知识文档

## 第一章：概述

这是用于测试知识库导入功能的示例文档。

RAG（Retrieval-Augmented Generation）是一种从外部知识库检索相关信息，并将检索结果作为上下文提供给 LLM 以生成回答的技术。

## 第二章：架构

RAG 系统通常包含两个核心组件：

1. **检索（Retrieve）**：使用向量数据库（如 Supabase pgvector）查找与问题相关的文档片段
2. **生成（Generate）**：将检索到的内容作为上下文，调用 LLM 生成回答

使用 LangGraph 可以方便地构建这样的流水线：

```
START → retrieve → generate → END
```
