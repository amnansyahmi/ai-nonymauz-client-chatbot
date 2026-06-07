'use client';

import { FormEvent, useRef, useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: { id: string; title: string; category: string }[];
};

const starterQuestions = [
  'What is your warranty policy?',
  'Macam mana nak book installation?',
  'Can I return an item after delivery?',
  'I need a custom quotation. What should I provide?'
];

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! Saya AI support assistant. Tanya saya tentang warranty, refund, installation booking, support escalation, atau company FAQ.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.map(({ role, content }) => ({ role, content })) })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources || []
        }
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: `Sorry, ada error: ${message}`
        }
      ]);
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
              {message.content.split('\n').map((line, lineIndex) => (
                <p key={lineIndex}>{line}</p>
              ))}
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
        {loading ? (
          <article className="message assistant">
            <div className="bubble typing">Thinking...</div>
          </article>
        ) : null}
      </div>

      <form ref={formRef} className="chat-form" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about SOP, FAQ, warranty, refund, booking..."
          aria-label="Question"
        />
        <button type="submit" disabled={loading || input.trim().length < 2}>
          Send
        </button>
      </form>
    </section>
  );
}
