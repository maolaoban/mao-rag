import { Hono } from 'hono'
import { workflow } from '../rag'

const queryRoutes = new Hono()

function statusMessage(node: string, message: string) {
  return `${JSON.stringify({ type: 'status', node, message })}\n\n`
}

// POST /api/query - 流式 RAG 问答
queryRoutes.post('/api/query', async (c) => {
  try {
    const { question, webSearch } = await c.req.json()

    if (!question) {
      return c.json({ error: '问题不能为空' }, 400)
    }

    console.log(`question: ${question}`);
    console.log(`isWebSearch: ${webSearch}`);

    const isWebSearch = Boolean(webSearch)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 初始状态：开始改写查询
          controller.enqueue(encoder.encode(statusMessage('rewriting', '正在分析问题...')))

          const result = await workflow.stream(
            { question, isWebSearch },
            { streamMode: ['updates', 'messages'] as any }
          );

          for await (const [mode, chunkData] of result as any) {
            if (mode === 'updates') {
              const nodeName = Object.keys(chunkData)[0]
              switch (nodeName) {
                case 'rewriteQueries':
                  controller.enqueue(encoder.encode(statusMessage('retrieving', '正在分析问题...')))
                  break
                case 'retrieve':
                  if (isWebSearch) {
                    controller.enqueue(encoder.encode(statusMessage('webSearching', '正在联网搜索...')))
                  } else {
                    controller.enqueue(encoder.encode(statusMessage('generating', '正在生成回答...')))
                  }
                  break
                case 'webSearch':
                  controller.enqueue(encoder.encode(statusMessage('generating', '正在生成回答...')))
                  break
              }
            } else if (mode === 'messages') {
              const [messageChunk, metadata] = chunkData as [any, any]
              if (metadata.langgraph_node !== 'generate') continue
              const content = messageChunk.content
              controller.enqueue(encoder.encode(
                `${JSON.stringify({ type: 'answer', content })}\n\n`
              ))
            }
          }
          controller.enqueue(encoder.encode('[DONE]\n\n'))
        } catch (err) {
          controller.enqueue(encoder.encode(
            `${JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : String(err) })}\n\n`
          ))
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

export default queryRoutes
