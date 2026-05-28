export type AgentIdempotencyStatus = 'completed' | 'failed' | 'skipped';

export interface AgentIdempotencyRecord {
  id: string;
  agentId: string;
  tool: string;
  targetType: string;
  targetId: string;
  inputSignature: string;
  status: AgentIdempotencyStatus;
  resultRef?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function buildAgentInputSignature(input: unknown) {
  return stableStringify(input);
}

export function createAgentIdempotencyKey(input: {
  agentId: string;
  tool: string;
  targetType: string;
  targetId: string;
  inputSignature: string;
}) {
  return `${input.agentId}::${input.tool}::${input.targetType}::${input.targetId}::${input.inputSignature}`;
}
