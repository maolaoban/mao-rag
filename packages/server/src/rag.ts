import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { supabaseClient, model, embeddings } from './config';

async function retrieve(state: typeof StateAnnotation.State) {
  const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
    client: supabaseClient,
    tableName: 'documents',
    queryName: 'match_documents',
  })
  const results = await vectorStore.similaritySearch(state.question, 2)
  console.log('检索结果:', results)
  return { ...state, documents: results }
}

async function generate(state: typeof StateAnnotation.State) {
  const context = state.documents.map((d: any) => d.pageContent).join('\n\n');
  const webSearchResult = state.webSearchResult || '';
  const prompt = `你是基于知识库的智能问答助手。请基于以下知识库内容或网络搜索结果回答用户的问题。如果内容中没有相关信息，请如实告知。

    知识库内容：
    ${context}

    网络搜索结果：
    ${webSearchResult}

    用户问题：${state.question}

    请给出详细、准确的回答。回答内容来自知识库和网络搜索结果，不要编造信息。
    回答内容引用自知识库还是网络搜索结果，请在回答中注明。`

  // 直接调用 model.invoke，LangGraph 的 messages 模式会自动捕获 token 流
  const answer = await model.invoke([
    { role: 'user', content: prompt },
  ]) || '';

  console.log(' LLM生成结果:', answer)

  return { ...state, answer }
}

const webSearchNode = async (state: typeof StateAnnotation.State) => {
  console.log('WEB SEARCH')
  const apiKey = process.env.BOCHA_API_KEY;
  if (!apiKey) {
    throw new Error('Missing BOCHA_API_KEY');
  }
  const baseUrl = process.env.BOCHA_BASE_URL;
  if (!baseUrl) {
    throw new Error('Missing BOCHA_BASE_URL');
  }
  let response = null;
  try {
    response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: state.question,
        // 搜索指定时间范围内的网页
        freshness: "noLimit",
        // 是否显示文本摘要
        summary: true,
        // 返回条数
        count: 5
      })
    })
  } catch (error) {
    throw new Error('Failed to perform web search');
  }

  if (!response || !response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to perform web search: ${errorText}`);
  }

  const json = await response.json();

  if (json?.code !== 200 || !json?.data) {
    throw new Error(`Failed to perform web search: ${json?.msg}`);
  }

  const searchPages = json.data.webPages?.value || [];
  const webContext = searchPages.map((page: Record<string, any>, idx: number) =>
    `引用:${idx + 1}
      标题:${page.name}
      URL:${page.url}
      摘要:${page.summary}
      网站名称:${page.siteName}
      网站图标:${page.siteIcon}
      发布时间:${page.dateLastCrawled}
    `,
  ).join('\n\n');

  console.log('Web搜索结果:', webContext);

  return { ...state, webSearchResult: webContext }
}

const conditionalEdge = (state: typeof StateAnnotation.State) => {
  return state.isWebSearch ? 'webSearch' : 'generate'
}

// RAG 图定义
export const StateAnnotation = Annotation.Root({
  question: Annotation<string>(),
  isWebSearch: Annotation<boolean>(),
  documents: Annotation<any[]>({
    reducer: (_prev: any[], next: any[]) => next,
    default: () => [],
  }),
  webSearchResult: Annotation<string>(),
  answer: Annotation<string>(),
})

const workflow = new StateGraph(StateAnnotation)
  .addNode('retrieve', retrieve)
  .addNode("webSearch", webSearchNode)
  .addNode('generate', generate)
  .addEdge(START, 'retrieve')
  .addConditionalEdges('retrieve', conditionalEdge)
  .addEdge('webSearch', 'generate')
  .addEdge('generate', END)
  .compile();

const drawable = await workflow.getGraphAsync();
const mermaid = drawable.drawMermaid({ withStyles: true });
console.log(`Mermaid Live Editor: https://mermaid.live \n${mermaid}`);

export { workflow };
