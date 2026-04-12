import type { AgentModelOptionRead } from '../service/agent-chat';

const DEFAULT_AGENT_MODEL_LABEL = 'Default';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const withSuffix = (label: string, suffix: string): string => (
  label.endsWith(`(${suffix})`) ? label : `${label} (${suffix})`
);

export const getAgentConfiguredModelName = (configuration: unknown): string | null => {
  if (!isRecord(configuration) || typeof configuration.model_name !== 'string') {
    return null;
  }

  const modelName = configuration.model_name.trim();
  return modelName ? modelName : null;
};

export const copyAgentConfiguration = (configuration: unknown): Record<string, unknown> => (
  isRecord(configuration) ? { ...configuration } : {}
);

export const formatAgentModelLabel = (
  modelName: string,
  label?: string | null,
): string => {
  const explicitLabel = label?.trim();

  if (modelName.startsWith('gpt-5.4-mini')) {
    return withSuffix(explicitLabel || 'GPT-5.4 Mini', 'Balanced');
  }

  if (modelName.startsWith('gpt-5.4-nano')) {
    return withSuffix(explicitLabel || 'GPT-5.4 Nano', 'Fast');
  }

  return explicitLabel || modelName;
};

export const getAgentModelDisplayLabel = (
  modelName: string | null,
  label?: string | null,
): string => (
  modelName ? formatAgentModelLabel(modelName, label) : DEFAULT_AGENT_MODEL_LABEL
);

export const buildAgentModelOptions = (
  options: AgentModelOptionRead[],
  configuredModelName: string | null,
): AgentModelOptionRead[] => {
  const deduped: AgentModelOptionRead[] = [];
  const seen = new Set<string>();

  for (const option of options) {
    if (seen.has(option.name)) {
      continue;
    }
    seen.add(option.name);
    deduped.push(option);
  }

  if (configuredModelName && !seen.has(configuredModelName)) {
    deduped.push({ name: configuredModelName, label: configuredModelName });
  }

  return deduped;
};
