import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { MarkdownTextSplitter } from '@langchain/textsplitters'
import { createClient } from '@supabase/supabase-js'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { OpenAIEmbeddings } from '@langchain/openai'
import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

// Load .env (project root)
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env')
})


// Hono
const app = new Hono()

// CORS
app.use('/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowHeaders: ['Content-Type', 'Accept'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
}))

// Supabase Client
const supabaseClient = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// LLM
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  configuration: { baseURL: process.env.OPENAI_BASE_URL || '' },
  apiKey: process.env.OPENAI_API_KEY || '',
  temperature: 0
});

// Embeddings
const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDING_MODEL_NAME || 'text-embedding-v3',
  dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1024'),
  configuration: { baseURL: process.env.EMBEDDING_BASE_URL || '' },
  apiKey: process.env.EMBEDDING_API_KEY || '',
});

const routerSchema = z.object({
  strategy: z.enum(['simple', 'complex']),
  reason: z.string()
});

// ==================== RAG 核心逻辑 ====================

async function retrieve(state: typeof StateAnnotation.State) {
  const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
    client: supabaseClient,
    tableName: 'documents',
    queryName: 'match_documents',
  });
  const results = await vectorStore.similaritySearch(state.question, 2);
  console.log('Retrieved documents:', results);
  return { documents: results, question: state.question }
}

async function generate(state: typeof StateAnnotation.State) {
  const context = state.documents.map((d: any) => d.pageContent).join('\n\n')
  const prompt = `你是基于知识库的智能问答助手。请基于以下知识内容回答用户的问题。如果知识内容中没有相关信息，请如实告知。

    知识内容：
    ${context}

    用户问题：${state.question}

    请给出详细、准确的回答。`

  // 直接调用 model.invoke，LangGraph 的 messages 模式会自动捕获 token 流
  const answer = await model.invoke([
    { role: 'user', content: prompt },
  ]) || '';

  return { answer, question: state.question, documents: state.documents }
}

// RAG 图定义
const StateAnnotation = Annotation.Root({
  question: Annotation<string>(),
  documents: Annotation<any[]>({
    reducer: (_prev: any[], next: any[]) => next,
    default: () => [],
  }),
  answer: Annotation<string>()
})

const workflow = new StateGraph(StateAnnotation)
  .addNode('retrieve', retrieve)
  .addNode('generate', generate)
  .addEdge(START, 'retrieve')
  .addEdge('retrieve', 'generate')
  .addEdge('generate', END)
  .compile()

// ==================== 导入核心逻辑 ====================

async function loadVectorStore() {
  return SupabaseVectorStore.fromExistingIndex(embeddings, {
    client: supabaseClient,
    tableName: 'documents',
    queryName: 'match_documents',
  })
}

async function processFile(vectorStore: any, filename: string, content: string) {
  const splitter = new MarkdownTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })
  const chunks = await splitter.splitText(content)

  try {
    const { data: existing } = await supabaseClient
      .from('documents')
      .select('id')
      .eq('metadata.source', filename)
    if (existing) {
      await vectorStore.delete({ ids: existing.map((d: any) => d.id) })
    }
  } catch (e) {
    console.error(`Delete failed: ${e.message}`)
  }

  // 分批添加（dashscope embedding 单批上限 10，设为 5 留余量）
  const BATCH_SIZE = 5
  const docs = chunks.map((c: string) => ({ pageContent: c, metadata: { source: filename, uploaded_at: new Date().toISOString() } }))
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await vectorStore.addDocuments(docs.slice(i, i + BATCH_SIZE))
  }

  console.log(`  ✅ ${filename} → ${chunks.length} chunks`)
  return { name: filename, chunks: chunks.length, status: 'success' }
}

async function processFiles(vectorStore: any, files: Array<{ name: string; content: string }>) {
  const results: any[] = []
  let totalChunks = 0
  for (const { name, content } of files) {
    if (!content.trim()) continue
    const result = await processFile(vectorStore, name, content)
    totalChunks += result.chunks
    results.push(result)
  }
  return { results, totalChunks }
}

// ==================== API Routes ====================

// GET /api/knowledge/files - 查询已导入文件列表
app.get('/api/knowledge/files', async (c) => {
  try {
    const { data: docs, error } = await supabaseClient
      .from('documents')
      .select('id, content, metadata, uploaded_at')
      .order('id')

    if (error) {
      return c.json({ error: error.message }, 500)
    }

    // 按 source 分组统计
    const filesMap = new Map<string, { name: string; chunks: number; uploadedAt?: string }>()
    for (const doc of (docs || [])) {
      const meta = doc.metadata as Record<string, any>
      const source = meta.source || 'unknown'
      const existing = filesMap.get(source)
      if (existing) {
        existing.chunks++
      } else {
        filesMap.set(source, {
          name: source,
          chunks: 1,
          uploadedAt: doc.uploaded_at,
        })
      }
    }

    const files = Array.from(filesMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    return c.json({ files })
  } catch (err) {
    console.error('Error fetching files:', err)
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

// POST /api/knowledge/import - 触发导入
let importRunning = false
let importStatus: 'idle' | 'running' | 'success' | 'error' = 'idle'
let importMessage = ''

app.post('/api/knowledge/import', async (c) => {
  if (importRunning) {
    return c.json({ error: '导入正在进行中，请稍后再试' }, 409)
  }

  importRunning = true
  importStatus = 'running'
  importMessage = ''

  try {
    const knowledgeDir = process.env.KNOWLEDGE_DIR || './knowledge'
    const vectorStore = await loadVectorStore()

    const files = fs.readdirSync(knowledgeDir)
      .filter((f: string) => f.endsWith('.md'))
      .map((f: string) => path.join(knowledgeDir, f))

    if (files.length === 0) {
      importStatus = 'error'
      importMessage = '未找到 .md 文件'
      return c.json({ error: '未找到知识文件' }, 404)
    }

    const fileContents = files.map(fp => ({
      name: path.basename(fp),
      content: fs.readFileSync(fp, 'utf-8'),
    }))

    const { results, totalChunks } = await processFiles(vectorStore, fileContents)

    importStatus = 'success'
    importMessage = `导入完成！共导入 ${results.length} 个文件，${totalChunks} 个文本块`
    return c.json({ success: true, message: importMessage, results, totalChunks })
  } catch (err) {
    importStatus = 'error'
    importMessage = err instanceof Error ? err.message : '导入失败'
    console.error('Import error:', err)
    return c.json({ error: importMessage }, 500)
  } finally {
    importRunning = false
  }
})

// POST /api/knowledge/import-url — 从 URL 导入
app.post('/api/knowledge/import-url', async (c) => {
  if (importRunning) {
    return c.json({ error: '导入正在进行中，请稍后再试' }, 409)
  }

  importRunning = true
  importStatus = 'running'
  importMessage = ''

  try {
    const body = await c.req.json()
    const { url } = body as { url: string }

    if (!url) {
      return c.json({ error: 'URL 不能为空' }, 400)
    }

    const vectorStore = await loadVectorStore()

    // 1. 尝试从 URL 获取内容
    let content: string
    try {
      const res = await fetch(url)
      if (!res.ok) {
        importStatus = 'error'
        importMessage = `无法获取 URL: ${res.status} ${res.statusText}`
        return c.json({ error: importMessage }, 400)
      }
      content = await res.text()
    } catch (err) {
      importStatus = 'error'
      importMessage = err instanceof Error ? err.message : '无法获取 URL'
      return c.json({ error: importMessage }, 400)
    }

    // 2. 确定文件名
    const filename = decodeURIComponent(url.split('/').pop()?.split('?').shift()) || 'unknown.md'

    // 3. 处理文件
    const result = await processFile(vectorStore, filename, content)
    importStatus = 'success'
    importMessage = `导入完成：${filename} (${result.chunks} 个文本块)`
    return c.json({ success: true, message: importMessage, results: [result], totalChunks: result.chunks })
  } catch (err) {
    importStatus = 'error'
    importMessage = err instanceof Error ? err.message : '导入失败'
    console.error('URL import error:', err)
    return c.json({ error: importMessage }, 500)
  } finally {
    importRunning = false
  }
})

// POST /api/knowledge/import-upload — 上传文件导入
app.post('/api/knowledge/import-upload', async (c) => {
  if (importRunning) {
    return c.json({ error: '导入正在进行中，请稍后再试' }, 409)
  }

  importRunning = true
  importStatus = 'running'
  importMessage = ''

  try {
    const formData = await c.req.formData()
    const files = formData.get('files')

    if (!files || (files as File).size === 0) {
      return c.json({ error: '请选择要上传的文件' }, 400)
    }

    const vectorStore = await loadVectorStore()
    const fileContents: Array<{ name: string; content: string }> = []

    for (const file of (files as File)[Symbol.iterator] ? Array.from([files as File]) : [files as File]) {
      const name = file.name
      const content = await file.text()
      fileContents.push({ name, content })
    }

    const { results, totalChunks } = await processFiles(vectorStore, fileContents)

    importStatus = 'success'
    importMessage = `上传导入完成！共导入 ${results.length} 个文件，${totalChunks} 个文本块`
    return c.json({ success: true, message: importMessage, results, totalChunks })
  } catch (err) {
    importStatus = 'error'
    importMessage = err instanceof Error ? err.message : '导入失败'
    console.error('Upload import error:', err)
    return c.json({ error: importMessage }, 500)
  } finally {
    importRunning = false
  }
})

// GET /api/knowledge/import-status - 轮询导入状态
app.get('/api/knowledge/import-status', (c) => {
  return c.json({ status: importStatus, message: importMessage })
})

// POST /api/query - 流式 RAG 问答
app.post('/api/query', async (c) => {
  try {
    const { question } = await c.req.json();

    if (!question) {
      return c.json({ error: '问题不能为空' }, 400)
    }

    // Create a response stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Start the RAG pipeline
          // const result = await workflow.invoke({ question });
          // console.log('result', result);
          const result = await workflow.stream({ question }, { streamMode: 'messages' });
          console.log(result);
          for await (const [messageChunk, metadata] of result as any) {
            const content = messageChunk.content;
            controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'answer', content })}\n\n`));
          }
          controller.enqueue(encoder.encode('[DONE]\n\n'));
        } catch (err) {
          controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : String(err) })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Query error:', err)
    return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

// Serve frontend
app.get('*', async (c) => {
  const filePath = c.req.path === '/' ? '/index.html' : c.req.path
  try {
    const fullPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', filePath)
    // Only serve static files in production
    if (!fs.existsSync(fullPath)) {
      return c.html('404 - File Not Found')
    }
    return c.html(fs.readFileSync(fullPath, 'utf-8'))
  } catch {
    return c.html('404 - File Not Found')
  }
})

// ==================== Server Start ====================

const PORT = parseInt(process.env.PORT || '3000')

const server = serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`RAG服务运行在 http://localhost:${PORT}`)
console.log(`前端页面: http://localhost:5173 (通过 Vite HMR)`)

export { app, server }
