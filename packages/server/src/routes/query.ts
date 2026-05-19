import { Hono } from 'hono'
import { workflow } from '../rag'

const queryRoutes = new Hono()

// POST /api/query - 流式 RAG 问答
queryRoutes.post('/api/query', async (c) => {
  try {
    const { question, webSearch } = await c.req.json()

    if (!question) {
      return c.json({ error: '问题不能为空' }, 400)
    }

    console.log(`question: ${question}`);
    console.log(`isWebSearch: ${webSearch}`);

    // Create a response stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await workflow.stream({ question, isWebSearch: Boolean(webSearch) }, { streamMode: 'messages' });
          for await (const [messageChunk, metadata] of result as any) {
            const content = messageChunk.content;
            controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'answer', content })}\n\n`));
          }
          controller.enqueue(encoder.encode('[DONE]\n\n'))
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

export default queryRoutes
