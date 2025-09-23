export interface LLMProvider {
  name: string;
  label: string;
  authRequired: boolean;
  chat: (
    messages: ChatMessage[],
    options?: LLMOptions,
    token?: string | null,
  ) => Promise<string>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface BookContext {
  bookTitle: string;
  author: string;
  selectedText: string;
  currentChapter?: string;
  currentPageContext?: string;
  language?: string;
}

export interface ChatSession {
  id: string;
  bookKey: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export const LLM_MODELS = {
  openai: {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  },
  anthropic: {
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
  },
} as const;

export type OpenAIModel = keyof typeof LLM_MODELS.openai;
export type AnthropicModel = keyof typeof LLM_MODELS.anthropic;
export type LLMModel = OpenAIModel | AnthropicModel;