import { LLMProvider } from './types';
import { openaiProvider } from './providers/openai';
import { anthropicProvider } from './providers/anthropic';

export * from './types';

export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
};

export const getLLMProviders = (): LLMProvider[] => {
  return Object.values(LLM_PROVIDERS);
};

export const getLLMProvider = (name: string): LLMProvider | null => {
  return LLM_PROVIDERS[name] || null;
};