import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiMessageSquare } from 'react-icons/fi';
import Popup from '@/components/Popup';
import Select from '@/components/Select';
import { Position } from '@/utils/sel';
import { useAuth } from '@/context/AuthContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { ChatMessage, LLM_MODELS, LLMModel } from '@/services/llm/types';
import { getLLMProvider, getLLMProviders } from '@/services/llm';
import { buildBookContext, createChatMessages } from '@/services/llm/utils';
import { BookData } from '@/types/book';
import { FoliateView } from '@/types/view';

interface ChatbotPopupProps {
  text: string;
  position: Position;
  trianglePosition: Position;
  popupWidth: number;
  popupHeight: number;
  bookData: BookData;
  view: FoliateView | null;
}

interface ChatbotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const ChatbotPopup: React.FC<ChatbotPopupProps> = ({
  text,
  position,
  trianglePosition,
  popupWidth,
  popupHeight,
  bookData,
  view,
}) => {
  const _ = useTranslation();
  const { token } = useAuth();
  const { settings, setSettings } = useSettingsStore();
  
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState(settings.globalReadSettings.llmProvider || 'openai');
  const [model, setModel] = useState<LLMModel>(settings.globalReadSettings.llmModel || 'gpt-4o-mini');
  const [providers, setProviders] = useState<{name: string; label: string}[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const llmProviders = getLLMProviders();

  useEffect(() => {
    const availableProviders = llmProviders.map((p) => {
      let label = p.label;
      if (p.authRequired && !token) {
        label = `${label} (${_('Login Required')})`;
      }
      return { name: p.name, label };
    });
    setProviders(availableProviders);
  }, [llmProviders, token, _]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Focus input when popup opens
    inputRef.current?.focus();
  }, []);

  const getAvailableModels = () => {
    if (provider === 'openai') {
      return Object.entries(LLM_MODELS.openai).map(([key, label]) => ({ value: key, label }));
    } else if (provider === 'anthropic') {
      return Object.entries(LLM_MODELS.anthropic).map(([key, label]) => ({ value: key, label }));
    }
    return [];
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    // Reset model to first available for new provider
    const availableModels = getAvailableModels();
    if (availableModels.length > 0) {
      setModel(availableModels[0].value as LLMModel);
    }
    // Save to settings
    setSettings({
      ...settings,
      globalReadSettings: {
        ...settings.globalReadSettings,
        llmProvider: newProvider,
      },
    });
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel as LLMModel);
    setSettings({
      ...settings,
      globalReadSettings: {
        ...settings.globalReadSettings,
        llmModel: newModel as LLMModel,
      },
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const selectedProvider = getLLMProvider(provider);
    if (!selectedProvider) {
      setError(_('Selected LLM provider not available'));
      return;
    }

    if (selectedProvider.authRequired && !token) {
      setError(_('Please log in to use the chatbot'));
      return;
    }

    const userMessage: ChatbotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      // Build context from the current book and selected text
      const context = buildBookContext(bookData, view, text);
      
      // Convert messages for LLM API
      const chatMessages: ChatMessage[] = createChatMessages(
        context,
        userMessage.content,
        messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      );

      const response = await selectedProvider.chat(chatMessages, {
        model,
        temperature: 0.7,
        maxTokens: 1000,
      }, token);

      const assistantMessage: ChatbotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : _('Failed to send message'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div>
      <Popup
        trianglePosition={trianglePosition}
        width={popupWidth}
        height={popupHeight}
        position={position}
        className='flex flex-col bg-gray-600 text-white'
        triangleClassName='text-gray-600'
      >
        {/* Header */}
        <div className='border-b border-gray-500 p-3'>
          <div className='mb-2 flex items-center gap-2'>
            <FiMessageSquare className='text-blue-400' />
            <h1 className='text-sm font-medium'>{_('AI Assistant')}</h1>
          </div>
          <div className='flex gap-2'>
            <Select
              className='flex-1 bg-gray-700 text-white text-xs'
              value={provider}
              onChange={handleProviderChange}
              options={providers.map(p => ({ value: p.name, label: p.label }))}
            />
            <Select
              className='flex-1 bg-gray-700 text-white text-xs'
              value={model}
              onChange={handleModelChange}
              options={getAvailableModels()}
            />
          </div>
        </div>

        {/* Messages */}
        <div className='flex-1 overflow-y-auto p-3 space-y-3 min-h-0'>
          {/* Initial context message */}
          <div className='text-xs text-gray-300 border-l-2 border-blue-400 pl-2'>
            {_('Selected text')}: &quot;{text.slice(0, 100)}{text.length > 100 ? '...' : ''}&quot;
          </div>
          
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg p-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className='flex justify-start'>
              <div className='bg-gray-700 text-gray-100 rounded-lg p-2 text-sm'>
                <div className='flex items-center gap-1'>
                  <div className='animate-pulse'>●</div>
                  <div className='animate-pulse delay-100'>●</div>
                  <div className='animate-pulse delay-200'>●</div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className='text-red-400 text-sm border border-red-400 rounded p-2'>
              {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className='border-t border-gray-500 p-3'>
          <div className='flex gap-2'>
            <input
              ref={inputRef}
              type='text'
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={_('Ask a question about this text...')}
              className='flex-1 bg-gray-700 text-white placeholder-gray-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !inputMessage.trim()}
              className='bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded px-3 py-2 transition-colors'
            >
              <FiSend size={16} />
            </button>
          </div>
        </div>
      </Popup>
    </div>
  );
};

export default ChatbotPopup;