// Provider selection. Both adapters implement the same ChatAdapter contract over
// the loop's neutral history, so runChat is provider-agnostic. Unknown/absent
// provider falls back to Azure (GPT-5), keeping old clients working.
import type { ModelTurn } from './loop'
import { AZURE_LABEL, callAzure, streamAzure } from './complete.azure'
import { ANTHROPIC_LABEL, callAnthropic, streamAnthropic } from './complete.anthropic'

export type Provider = 'azure' | 'anthropic'
export type Usage = { inputTokens: number; outputTokens: number }
type Msg = Record<string, unknown>

export type ChatAdapter = {
  callModel: (history: Msg[], opts: { tools: boolean }) => Promise<ModelTurn & { usage?: Usage }>
  streamAnswer: (history: Msg[]) => AsyncIterable<{ token?: string; usage?: Usage }>
  label: string
}

const AZURE: ChatAdapter = { callModel: callAzure, streamAnswer: streamAzure, label: AZURE_LABEL }
const ANTHROPIC: ChatAdapter = { callModel: callAnthropic, streamAnswer: streamAnthropic, label: ANTHROPIC_LABEL }

export function pickAdapter(provider?: string): { adapter: ChatAdapter; provider: Provider } {
  return provider === 'anthropic'
    ? { adapter: ANTHROPIC, provider: 'anthropic' }
    : { adapter: AZURE, provider: 'azure' }
}
