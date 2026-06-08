'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

type Source = { id: string; title: string; category: string };

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
};

type StreamEvent = {
  type?: 'sources' | 'delta' | 'error' | 'done';
  text?: string;
  error?: string;
  sources?: Source[];
};

const starterQuestions = [
  'What is your warranty policy?',
  'Macam mana nak book installation?',
  'Can I return an item after delivery?',
  'I need a custom quotation. What should I provide?'
];

function parseSseEvents(buffer: string) {
  const events: StreamEvent[] = [];
  const blocks = buffer.split('\n\n');
  const remaining = blocks.pop() || '';

  for (const block of blocks) {
    const dataLines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s*/, ''));

    if (dataLines.length === 0) continue;

    const payload = dataLines.join('\n').trim();
    if (!payload || payload === '[DONE]') continue;

    try {
      events.push(JSON.parse(payload));
    } catch {
      events.push({ type: 'delta', text: payload });
    }
  }

  return { events, remaining };
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! Saya AI support assistant. Tanya saya tentang warranty, refund, installation booking, support escalation, atau company FAQ.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    const assistantIndex = nextMessages.length;

    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.map(({ role, content }) => ({ role, content })) })
      });

      if (!response.body) {
        throw new Error('No response body received from /api/chat');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAnswer = '';
      let currentSources: Source[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseEvents(buffer);
        buffer = parsed.remaining;

        for (const event of parsed.events) {
          if (event.type === 'sources') {
            currentSources = event.sources || [];
            setMessages((current) =>
              current.map((message, index) =>
                index === assistantIndex ? { ...message, sources: currentSources } : message
              )
            );
          }

          if (event.type === 'delta' && event.text) {
            fullAnswer += event.text;
            setMessages((current) =>
              current.map((message, index) =>
                index === assistantIndex ? { ...message, content: fullAnswer, sources: currentSources } : message
              )
            );
          }

          if (event.type === 'error') {
            throw new Error(event.error || 'Failed to get response');
          }
        }
      }

      const tail = parseSseEvents(buffer + '\n\n');
      for (const event of tail.events) {
        if (event.type === 'delta' && event.text) {
          fullAnswer += event.text;
        }
      }

      if (!fullAnswer.trim()) {
        setMessages((current) =>
          current.map((message, index) =>
            index === assistantIndex
              ? { ...message, content: 'Sorry, saya tak dapat jawapan daripada AI-nonymauz untuk request ini.' }
              : message
          )
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setMessages([...nextMessages, { role: 'assistant', content: `Sorry, ada error: ${message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask(input);
  }

  return (
    <section className="chat-shell" aria-label="AI-nonymauz client chatbot demo">
      <div className="chat-header">
        <div>
          <p className="eyebrow">AI-nonymauz Client System</p>
          <h2>Company Knowledge + Website Support Chatbot</h2>
        </div>
        <span className="status-dot">Live demo</span>
      </div>

      <div className="starter-grid">
        {starterQuestions.map((question) => (
          <button key={question} type="button" onClick={() => ask(question)} disabled={loading}>
            {question}
          </button>
        ))}
      </div>

      <div className="messages">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
            <div className="bubble">
              {message.content ? (
                message.content.split('\n').map((line, lineIndex) => <p key={lineIndex}>{line || '\u00a0'}</p>)
              ) : (
                <p className="typing">AI is typing...</p>
              )}
              {message.sources && message.sources.length > 0 ? (
                <div className="sources">
                  <strong>Sources:</strong>
                  {message.sources.map((source) => (
                    <span key={source.id}>{source.title}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about SOP, FAQ, warranty, refund, booking..."
          aria-label="Question"
        />
        <button type="submit" disabled={loading || input.trim().length < 2}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </section>
  );
}
