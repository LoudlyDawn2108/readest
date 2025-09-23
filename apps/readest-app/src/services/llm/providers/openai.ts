import { LLMProvider, ChatMessage, LLMOptions } from '../types';

export const openaiProvider: LLMProvider = {
  name: 'openai',
  label: 'OpenAI',
  authRequired: true,
  chat: async (
    messages: ChatMessage[],
    options?: LLMOptions,
    token?: string | null,
  ): Promise<string> => {
    if (!token) {
      throw new Error('OpenAI API key is required');
    }

    const model = options?.model || 'gpt-4o-mini';
    const temperature = options?.temperature || 0.7;
    const maxTokens = options?.maxTokens || 1000;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}${errorData.error?.message ? ` - ${errorData.error.message}` : ''}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI');
      }

      return data.choices[0].message.content || 'No response generated';
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw error;
    }
  },
};