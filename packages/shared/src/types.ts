export interface QueryMessage {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export interface KnowledgeFile {
  name: string
  chunks: number
  uploadedAt: string
}

export interface QueryRequest {
  question: string
}

export interface QueryResponse {
  type: 'answer' | 'error'
  content?: string
  error?: string
}

export interface ImportResult {
  success?: boolean
  message?: string
  results?: Array<{ name: string; chunks: number; status: string }>
  totalChunks?: number
  error?: string
}

export interface ImportStatus {
  status: 'idle' | 'running' | 'success' | 'error'
  message: string
}
