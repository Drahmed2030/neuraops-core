import type { PaymentPort } from './ports'
import { createMoyasarSandboxAdapter as createRuntimeAdapter } from './moyasar-sandbox-adapter.mjs'

export type MoyasarSandboxAdapterConfig = {
  secretKey: string
  webhookSecret: string
  callbackUrl?: string
  successUrl?: string
  backUrl?: string
  fetchFn?: typeof fetch
  clock?: () => Date
}

export type MoyasarSandboxPaymentPort = PaymentPort & {
  provider: 'moyasar'
  environment: 'sandbox'
}

const typedRuntimeAdapter = createRuntimeAdapter as unknown as (
  config: MoyasarSandboxAdapterConfig,
) => MoyasarSandboxPaymentPort

export function createMoyasarSandboxPaymentPort(
  config: MoyasarSandboxAdapterConfig,
): MoyasarSandboxPaymentPort {
  return typedRuntimeAdapter(config)
}
