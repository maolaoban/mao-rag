import { Hono } from 'hono'
import path from 'path'
import fs from 'fs'
import { supabaseClient } from '../config'
import {
  loadVectorStore,
  processFile,
  processFiles,
  getImportRunning,
  setImportRunning,
  getImportStatus,
  setImportStatus,
  getImportMessage,
  setImportMessage,
} from '../knowledge'

const knowledgeRoutes = new Hono()

// GET /api/knowledge/files - 查询已导入文件列表
knowledgeRoutes.get('/api/knowledge/files', async (c) => {
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
knowledgeRoutes.post('/api/knowledge/import', async (c) => {
  if (getImportRunning()) {
    return c.json({ error: '导入正在进行中，请稍后再试' }, 409)
  }

  setImportRunning(true)
  setImportStatus('running')
  setImportMessage('')

  try {
    const knowledgeDir = process.env.KNOWLEDGE_DIR || './knowledge'
    const vectorStore = await loadVectorStore()

    const files = fs.readdirSync(knowledgeDir)
      .filter((f: string) => f.endsWith('.md'))
      .map((f: string) => path.join(knowledgeDir, f))

    if (files.length === 0) {
      setImportStatus('error')
      setImportMessage('未找到 .md 文件')
      return c.json({ error: '未找到知识文件' }, 404)
    }

    const fileContents = files.map(fp => ({
      name: path.basename(fp),
      content: fs.readFileSync(fp, 'utf-8'),
    }))

    const { results, totalChunks } = await processFiles(vectorStore, fileContents)

    setImportStatus('success')
    const msg = `导入完成！共导入 ${results.length} 个文件，${totalChunks} 个文本块`
    setImportMessage(msg)
    return c.json({ success: true, message: msg, results, totalChunks })
  } catch (err) {
    setImportStatus('error')
    const msg = err instanceof Error ? err.message : '导入失败'
    setImportMessage(msg)
    console.error('Import error:', err)
    return c.json({ error: msg }, 500)
  } finally {
    setImportRunning(false)
  }
})

// POST /api/knowledge/import-url — 从 URL 导入
knowledgeRoutes.post('/api/knowledge/import-url', async (c) => {
  if (getImportRunning()) {
    return c.json({ error: '导入正在进行中，请稍后再试' }, 409)
  }

  setImportRunning(true)
  setImportStatus('running')
  setImportMessage('')

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
        setImportStatus('error')
        const msg = `无法获取 URL: ${res.status} ${res.statusText}`
        setImportMessage(msg)
        return c.json({ error: msg }, 400)
      }
      content = await res.text()
    } catch (err) {
      setImportStatus('error')
      const msg = err instanceof Error ? err.message : '无法获取 URL'
      setImportMessage(msg)
      return c.json({ error: msg }, 400)
    }

    // 2. 确定文件名
    const filename = decodeURIComponent(url.split('/').pop()?.split('?').shift()) || 'unknown.md'

    // 3. 处理文件
    const result = await processFile(vectorStore, filename, content)
    setImportStatus('success')
    const msg = `导入完成：${filename} (${result.chunks} 个文本块)`
    setImportMessage(msg)
    return c.json({ success: true, message: msg, results: [result], totalChunks: result.chunks })
  } catch (err) {
    setImportStatus('error')
    const msg = err instanceof Error ? err.message : '导入失败'
    setImportMessage(msg)
    console.error('URL import error:', err)
    return c.json({ error: msg }, 500)
  } finally {
    setImportRunning(false)
  }
})

// POST /api/knowledge/import-upload — 上传文件导入
knowledgeRoutes.post('/api/knowledge/import-upload', async (c) => {
  if (getImportRunning()) {
    return c.json({ error: '导入正在进行中，请稍后再试' }, 409)
  }

  setImportRunning(true)
  setImportStatus('running')
  setImportMessage('')

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

    setImportStatus('success')
    const msg = `上传导入完成！共导入 ${results.length} 个文件，${totalChunks} 个文本块`
    setImportMessage(msg)
    return c.json({ success: true, message: msg, results, totalChunks })
  } catch (err) {
    setImportStatus('error')
    const msg = err instanceof Error ? err.message : '导入失败'
    setImportMessage(msg)
    console.error('Upload import error:', err)
    return c.json({ error: msg }, 500)
  } finally {
    setImportRunning(false)
  }
})

// GET /api/knowledge/import-status - 轮询导入状态
knowledgeRoutes.get('/api/knowledge/import-status', (c) => {
  return c.json({ status: getImportStatus(), message: getImportMessage() })
})

export default knowledgeRoutes
