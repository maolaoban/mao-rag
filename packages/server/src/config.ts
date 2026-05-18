import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

// Load .env (project root)
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env')
})

// Supabase Client
export const supabaseClient = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

// LLM
export const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  configuration: { baseURL: process.env.OPENAI_BASE_URL || '' },
  apiKey: process.env.OPENAI_API_KEY || '',
  temperature: 0
})

// Embeddings
export const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDING_MODEL_NAME || 'text-embedding-v3',
  dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1024'),
  configuration: { baseURL: process.env.EMBEDDING_BASE_URL || '' },
  apiKey: process.env.EMBEDDING_API_KEY || '',
})

export const routerSchema = z.object({
  strategy: z.enum(['simple', 'complex']),
  reason: z.string()
})
