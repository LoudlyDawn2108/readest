import { BookContext, ChatMessage } from './types';
import { BookData } from '@/types/book';
import { FoliateView } from '@/types/view';

export const buildBookContext = (
  bookData: BookData,
  view: FoliateView | null,
  selectedText: string,
  currentPageText?: string,
): BookContext => {
  const book = bookData.book;
  const context: BookContext = {
    bookTitle: book.title || 'Unknown Title',
    author: book.author || 'Unknown Author',
    selectedText,
    language: book.primaryLanguage || 'en',
  };

  // Try to get current chapter/section information
  if (view && view.book) {
    try {
      // Get current location information
      const contents = view.renderer?.getContents?.();
      if (contents && contents.length > 0) {
        // Extract some context from the current page
        const currentContent = contents[0];
        if (currentContent?.doc) {
          const bodyText = currentContent.doc.body?.textContent;
          if (bodyText) {
            // Get a reasonable amount of context (up to 2000 characters)
            context.currentPageContext = bodyText.slice(0, 2000);
          }
        }
      }
    } catch (error) {
      console.warn('Could not extract page context:', error);
    }
  }

  // If we have currentPageText passed in, use that instead
  if (currentPageText) {
    context.currentPageContext = currentPageText.slice(0, 2000);
  }

  return context;
};

export const buildSystemPrompt = (context: BookContext): string => {
  const { bookTitle, author, selectedText, currentPageContext, language } = context;

  const prompt = `You are a helpful AI assistant that answers questions about books and reading. You have context about the current book and page the user is reading.

Book Information:
- Title: "${bookTitle}"
- Author: "${author}"
${language ? `- Language: ${language}` : ''}

Selected Text: "${selectedText}"

${currentPageContext ? `Current Page Context:\n"${currentPageContext}"\n` : ''}

Please answer questions helpfully and accurately based on the book content and your knowledge. If the user asks about something not directly related to the selected text or book context, you can still provide helpful general information. Keep your responses concise but informative.`;

  return prompt;
};

export const createChatMessages = (
  context: BookContext,
  userMessage: string,
  previousMessages: ChatMessage[] = [],
): ChatMessage[] => {
  const systemPrompt = buildSystemPrompt(context);
  
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...previousMessages.filter(m => m.role !== 'system'), // Remove any previous system messages
    { role: 'user', content: userMessage },
  ];

  return messages;
};