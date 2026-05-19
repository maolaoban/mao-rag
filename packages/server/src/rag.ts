import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { supabaseClient, model, embeddings, routerSchema } from './config'

async function retrieve(state: typeof StateAnnotation.State) {
  const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
    client: supabaseClient,
    tableName: 'documents',
    queryName: 'match_documents',
  })
  const results = await vectorStore.similaritySearch(state.question, 2)
  console.log('检索结果:', results)
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

  console.log(' LLM生成结果:', answer)

  return { answer, question: state.question, documents: state.documents }
}

const routeQuestionNode = async (state: typeof StateAnnotation.State) => {
  console.log('--ROUTE--')
  const router = model.withStructuredOutput(routerSchema)
  const result = await router.invoke(`请判断用户问题的复杂程度，是否需要外部检索。
    复杂程度：
    - simple（简单）
    - complex（复杂）
    用户问题：${state.question}`)
  return {
    question: state.question,
    strategy: result.strategy,
    reason: result.reason
  }
}

// RAG 图定义
export const StateAnnotation = Annotation.Root({
  question: Annotation<string>(),
  documents: Annotation<any[]>({
    reducer: (_prev: any[], next: any[]) => next,
    default: () => [],
  }),
  answer: Annotation<string>()
})

export const workflow = new StateGraph(StateAnnotation)
  .addNode('retrieve', retrieve)
  .addNode('generate', generate)
  .addEdge(START, 'retrieve')
  .addEdge('retrieve', 'generate')
  .addEdge('generate', END)
  .compile()
