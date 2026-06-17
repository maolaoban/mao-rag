import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { StateGraph, Annotation, START, END, MemorySaver } from '@langchain/langgraph';
import { supabaseClient, model, embeddings } from './config';


const hybridRetriever = async (query: string, topK: number = 5) => {
  const queryEmbedding = await embeddings.embedQuery(query);

  const { data, error } = await supabaseClient.rpc('hybrid_search', {
    query_text: query,
    query_embedding: queryEmbedding,
    match_count: topK,        // 每个查询返回的结果数
    rank_constant: 60,        // RRF 常数，默认 60
  });

  if (error) {
    throw new Error(`混合检索失败: ${error.message}`);
  }

  // 1.3 转换为 LangChain 兼容的 Document 格式
  return data.map((row: any) => ({
    pageContent: row.content,
    metadata: row.metadata || {},
    id: row.id,
    score: row.rrf_score,     // 保留融合分数便于调试
  }));
}

// 普通相似性检索
// const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
//   client: supabaseClient,
//   tableName: 'documents',
//   queryName: 'match_documents',
// })

async function retrieve(state: typeof StateAnnotation.State) {

  // 原始 + 改写
  const queries = state.rewrittenQuestion || [state.question]

  // 并行执行多个查询的混合检索
  const resultsArrays = await Promise.all(
    queries.map(query => hybridRetriever(query, 5))
  );

  // 4. 合并所有结果
  const results = resultsArrays.flat();

  // 5. 按内容去重（避免不同查询召回同一文档块）
  const uniqueResults = Array.from(
    new Map(results.map(doc => [doc.pageContent, doc])).values()
  );

  console.log('检索结果:', uniqueResults)
  return { ...state, documents: uniqueResults }
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
    如果引入网络搜索结果时需要做好标注。`

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

// 查询改写
const rewriteNode = async (state: typeof StateAnnotation.State) => {
  const prompt = `请将以下用户问题改写为 3 个不同侧重点的搜索查询，每个查询一行，不要有多余的解释。
      用户问题：${state.question}
      输出格式：
      查询1：...
      查询2：...
      查询3：...`;
  const response = await model.invoke([
    { role: 'user', content: prompt },
  ]);
  const content = response.content as string;
  const lines = content.split('\n').filter(l => l.includes('：') || l.trim().length > 0);
  // 提取冒号后面的部分
  const queries = lines.map(l => l.split('：').pop()?.trim() || l.trim()).filter(q => q.length > 0);
  // 至少保留原问题
  const finalQueries = queries.length >= 2 ? queries : [state.question];
  console.log('改写后的查询:', finalQueries);
  return { ...state, rewrittenQuestion: finalQueries };
}

const checkPointer = new MemorySaver();

// RAG 图定义
export const StateAnnotation = Annotation.Root({
  question: Annotation<string>(),
  rewrittenQuestion: Annotation<string[]>(),
  isWebSearch: Annotation<boolean>(),
  documents: Annotation<any[]>({
    reducer: (_prev: any[], next: any[]) => next,
    default: () => [],
  }),
  webSearchResult: Annotation<string>(),
  answer: Annotation<string>(),
})

const workflow = new StateGraph(StateAnnotation)
  .addNode('rewriteQueries', rewriteNode)
  .addNode('retrieve', retrieve)
  .addNode("webSearch", webSearchNode)
  .addNode('generate', generate)
  .addEdge(START, 'rewriteQueries')
  .addEdge('rewriteQueries', 'retrieve')
  .addConditionalEdges('retrieve', conditionalEdge)
  .addEdge('webSearch', 'generate')
  .addEdge('generate', END)
  .compile();

const drawable = await workflow.getGraphAsync();
const mermaid = drawable.drawMermaid({ withStyles: true });
console.log(`Mermaid Live Editor: https://mermaid.live \n${mermaid}`);

export { workflow };
