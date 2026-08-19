export type AgentName =
  | 'router'
  | 'order_tracker'
  | 'returns'
  | 'product_expert'
  | 'menu_offers'
  | 'store_info'

export interface AgentResponse {
  agent: AgentName
  answer: string
  confidence: number
  should_escalate: boolean
  escalation_reason: string | null
  retrieved_chunks: string[]
}

export interface RoutingDecision {
  agent: AgentName
  reasoning: string
  confidence: number
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}
