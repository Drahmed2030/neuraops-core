// NeuraOps Core — Types

export type StoreType = 'cafe' | 'restaurant' | 'retail' | 'other'
export type StoreStatus = 'pilot' | 'active' | 'paused' | 'cancelled'
export type StorePlan = 'free_pilot' | 'starter' | 'pro' | 'custom'

export interface Store {
  id: string
  name: string
  slug: string
  owner_name: string
  phone: string
  email?: string
  type: StoreType
  status: StoreStatus
  plan: StorePlan
  settings: StoreSettings
  created_at: string
  updated_at: string
}

export interface StoreSettings {
  default_language: 'ar' | 'en'
  tone: 'formal' | 'friendly'
  working_hours: WorkingHours
  sla: SLAConfig
  auto_messages: AutoMessages
}

export interface WorkingHours {
  [day: string]: { open: string; close: string; enabled: boolean }
}

export interface SLAConfig {
  critical: { first_response: number; resolution: number }
  high: { first_response: number; resolution: number }
  medium: { first_response: number; resolution: number }
  low: { first_response: number; resolution: number }
}

export interface AutoMessages {
  escalation_during_hours: string
  outside_hours: string
  sla_breach: string
}

export interface KnowledgeChunk {
  id: string
  store_id: string
  content: string
  embedding?: number[]
  category: 'shipping' | 'returns' | 'products' | 'menu' | 'hours' | 'general'
  language: 'ar' | 'en'
  metadata: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface Conversation {
  id: string
  store_id: string
  session_id: string
  channel: 'whatsapp' | 'instagram' | 'web' | 'demo'
  status: 'open' | 'escalated' | 'closed'
  started_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'human'
  content: string
  agent_used?: string
  confidence?: number
  retrieved_chunks?: string[]
  created_at: string
}

export type EscalationPriority = 'critical' | 'high' | 'medium' | 'low'
export type EscalationStatus = 'pending' | 'in_progress' | 'resolved' | 'closed'

export interface Escalation {
  id: string
  conversation_id: string
  store_id: string
  reason: string
  priority: EscalationPriority
  confidence_score: number
  status: EscalationStatus
  assigned_to?: string
  context: Record<string, any>
  sla_deadline?: string
  created_at: string
  resolved_at?: string
}

export type AgentName = 'router' | 'order_tracker' | 'returns' | 'product_expert' | 'menu' | 'store_info'

export interface AgentResponse {
  agent: AgentName
  answer: string
  confidence: number
  should_escalate: boolean
  escalation_reason?: string
  retrieved_chunks: string[]
}
