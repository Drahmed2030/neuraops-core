import { routeMessage } from './router'
import { orderTrackerAgent } from './order-tracker'
import { returnsAgent } from './returns'
import { productExpertAgent } from './product-expert'
import { menuOffersAgent } from './menu-offers'
import { storeInfoAgent } from './store-info'
import type { AgentName, AgentResponse, ChatHistoryMessage } from './types'
import { emitRuntimeIncident } from '@/lib/reliability/runtime-sensor.mjs'

/**
 * Entry point for every incoming customer message.
 *
 * Flow:
 *  1. Router analyzes intent and picks ONE specialist agent (real
 *     classification call, not a guess-then-fallback chain)
 *  2. That specialist agent retrieves its own relevant knowledge-base
 *     context and generates the actual customer-facing response
 *  3. If the specialist's own confidence is low OR it explicitly
 *     flags escalation, that decision is passed straight through
 *     to the API layer, which creates the escalation record
 *
 * This replaces the single-agent MVP router with genuine
 * multi-agent task distribution.
 */
export async function handleCustomerMessage(
  message: string,
  storeId: string,
  history: ChatHistoryMessage[]
): Promise<AgentResponse & { routingReasoning: string }> {
  let routing
  try {
    routing = await routeMessage(message, history)
  } catch (error) {
    emitRuntimeIncident({
      service: 'agents/orchestrator',
      operation: 'route-message',
      status: 503,
      error,
      provider: 'openai',
      phase: 'routing',
      context: { storeIdHashable: storeId ? 'present' : 'missing', historyCount: history.length },
    })
    throw error
  }

  const agentRunners: Record<Exclude<AgentName, 'router'>, () => Promise<AgentResponse>> = {
    order_tracker: () => orderTrackerAgent(message, storeId, history),
    returns: () => returnsAgent(message, storeId, history),
    product_expert: () => productExpertAgent(message, storeId, history),
    menu_offers: () => menuOffersAgent(message, storeId, history),
    store_info: () => storeInfoAgent(message, storeId, history),
  }

  const runner = agentRunners[routing.agent as Exclude<AgentName, 'router'>]
  let result: AgentResponse
  try {
    result = await runner()
  } catch (error) {
    emitRuntimeIncident({
      service: 'agents/orchestrator',
      operation: 'specialist-agent',
      status: 503,
      error,
      provider: 'openai',
      phase: 'specialist',
      context: { agent: routing.agent, historyCount: history.length },
    })
    throw error
  }

  // Low routing confidence is itself a signal worth escalating on,
  // even if the specialist agent felt confident in its own answer —
  // it means we're not sure the RIGHT agent even handled this.
  const finalShouldEscalate = result.should_escalate || routing.confidence < 0.4

  return {
    ...result,
    should_escalate: finalShouldEscalate,
    escalation_reason: result.escalation_reason ?? (
      routing.confidence < 0.4 ? 'ثقة منخفضة في تحديد نوع الاستفسار' : null
    ),
    routingReasoning: routing.reasoning,
  }
}
