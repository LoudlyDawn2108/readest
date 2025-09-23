import { LLMProvider, ChatMessage, LLMOptions } from '../types';

export const anthropicProvider: LLMProvider = {
  name: 'anthropic',
  label: 'Anthropic',
  authRequired: true,
  chat: async (
    messages: ChatMessage[],
    options?: LLMOptions,
    token?: string | null,
  ): Promise<string> => {
    if (!token) {
      throw new Error('Anthropic API key is required');
    }

    const model = options?.model || 'claude-3-5-sonnet-20241022';
    const temperature = options?.temperature || 0.7;
    const maxTokens = options?.maxTokens || 1000;

    // Convert messages format for Anthropic API
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': token,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemMessage?.content,
          messages: userMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}${errorData.error?.message ? ` - ${errorData.error.message}` : ''}`);
      }

      const data = await response.json();
      
      if (!data.content || data.content.length === 0) {
        throw new Error('No response from Anthropic');
      }

      return data.content[0].text || 'No response generated';
    } catch (error) {
      console.error('Anthropic chat error:', error);
      throw error;
    }
  },
};