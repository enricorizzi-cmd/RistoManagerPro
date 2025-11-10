import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../src/config/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Ciao! Sono il tuo consulente esperto di gestione finanziaria aziendale e menu engineering specializzato in ristorazione.\n\nAnalizzo i DATI CONCRETI del tuo database per fornirti:\n\n• Analisi finanziarie approfondite basate sui dati reali\n• Analisi menu engineering: food cost, marginalità, matrice BCG\n• Identificazione di problemi e opportunità specifiche\n• Confronti con benchmark di settore\n• Raccomandazioni concrete e azionabili\n• Interpretazione di indicatori KPI\n• Analisi di trend e proiezioni\n• Ottimizzazione menu e ricette\n\nCome posso aiutarti oggi con i tuoi dati finanziari o di menu engineering?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentLocation, showNotification } = useAppContext();
  const { token } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      if (!token) {
        throw new Error('Non autenticato');
      }

      if (!currentLocation?.id) {
        throw new Error('Location non selezionata');
      }

      const response = await fetch(`${API_BASE_URL}/api/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          locationId: currentLocation.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella richiesta');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Mi dispiace, si è verificato un errore: ${error.message || 'Errore sconosciuto'}. Riprova più tardi.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      showNotification('Errore nel chatbot', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Helper function to parse markdown inline formatting
  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${match.index}`} className="font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  const formatMessage = (content: string) => {
    // Split by lines and process each
    return content.split('\n').map((line, index) => {
      const trimmedLine = line.trim();

      // Empty line
      if (!trimmedLine) {
        return <div key={index} className="my-2"></div>;
      }

      // Headings (### Title)
      if (trimmedLine.startsWith('###')) {
        const title = trimmedLine.replace(/^###+\s*/, '');
        return (
          <h3 key={index} className="font-bold text-lg mt-4 mb-2 text-gray-900">
            {parseInlineMarkdown(title)}
          </h3>
        );
      }

      // Subheadings (## Title)
      if (trimmedLine.startsWith('##')) {
        const title = trimmedLine.replace(/^##+\s*/, '');
        return (
          <h4
            key={index}
            className="font-semibold text-base mt-3 mb-2 text-gray-800"
          >
            {parseInlineMarkdown(title)}
          </h4>
        );
      }

      // Bullet points
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        const text = trimmedLine.substring(1).trim();
        return (
          <div key={index} className="flex items-start gap-2 my-1">
            <span className="text-primary-600 mt-1 flex-shrink-0">•</span>
            <span className="flex-1">{parseInlineMarkdown(text)}</span>
          </div>
        );
      }

      // Numbered list
      if (/^\d+\./.test(trimmedLine)) {
        const match = trimmedLine.match(/^(\d+)\.\s*(.+)/);
        if (match) {
          return (
            <div key={index} className="flex items-start gap-2 my-1">
              <span className="text-primary-600 font-semibold mt-1 flex-shrink-0">
                {match[1]}.
              </span>
              <span className="flex-1">{parseInlineMarkdown(match[2])}</span>
            </div>
          );
        }
      }

      // Regular line with inline formatting
      return (
        <div key={index} className="my-1 text-gray-700 leading-relaxed">
          {parseInlineMarkdown(trimmedLine)}
        </div>
      );
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 z-40 flex items-center gap-2"
        aria-label="Apri chatbot"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="hidden lg:inline text-sm font-medium">Assistente</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 h-[500px] bg-white rounded-xl shadow-xl flex flex-col z-40 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-3 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Assistente</h3>
            <p className="text-xs text-primary-100">RistoManager</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          aria-label="Chiudi chatbot"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-200'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">
                {formatMessage(message.content)}
              </div>
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-200 rounded-b-xl">
        <div className="flex items-end gap-2">
          <textarea
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Scrivi un messaggio..."
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl p-3 transition-colors"
            aria-label="Invia messaggio"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Premi Invio per inviare, Shift+Invio per andare a capo
        </p>
      </div>
    </div>
  );
};

export default Chatbot;
