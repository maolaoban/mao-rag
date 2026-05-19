import { MarkdownTextSplitter } from '@langchain/textsplitters'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { supabaseClient, embeddings } from './config'

export async function loadVectorStore() {
  return SupabaseVectorStore.fromExistingIndex(embeddings, {
    client: supabaseClient,
    tableName: 'documents',
    queryName: 'match_documents',
  })
}

export async function processFile(vectorStore: any, filename: string, content: string) {
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

export async function processFiles(vectorStore: any, files: Array<{ name: string; content: string }>) {
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

// Import 状态管理
let importRunning = false
let importStatus: 'idle' | 'running' | 'success' | 'error' = 'idle'
let importMessage = ''

export function getImportRunning() { return importRunning }
export function setImportRunning(v: boolean) { importRunning = v }
export function getImportStatus() { return importStatus }
export function setImportStatus(v: 'idle' | 'running' | 'success' | 'error') { importStatus = v }
export function getImportMessage() { return importMessage }
export function setImportMessage(v: string) { importMessage = v }
