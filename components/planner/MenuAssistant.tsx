'use client';

import { FormEvent } from 'react';
import type { ActiveTab, Message } from './types';

export type MenuAssistantTab = Exclude<ActiveTab, 'chat'>;

export const menuAssistantTabs: MenuAssistantTab[] = ['dashboard', 'checklist', 'calendar', 'budget', 'rsvp', 'vendors'];

export const menuAssistantPrompts: Record<MenuAssistantTab, { title: string; placeholder: string; quick: string[] }> = {
  dashboard: {
    title: 'Dashboard assistant',
    placeholder: 'Ask what needs attention this week...',
    quick: ['What should I do next?', 'Summarize my planning status', 'What is urgent?']
  },
  checklist: {
    title: 'Checklist assistant',
    placeholder: 'Ask to create, improve, or prioritize checklist items...',
    quick: ['Create final week checklist', 'Prioritize incomplete tasks', 'Add vendor follow-up tasks']
  },
  calendar: {
    title: 'Calendar assistant',
    placeholder: 'Ask to schedule a wedding appointment...',
    quick: ['Add appointment tomorrow at 3pm for vendor follow-up', 'What should I schedule next?', 'Plan vendor confirmation week']
  },
  budget: {
    title: 'Budget assistant',
    placeholder: 'Ask about budget categories, overages, or payment planning...',
    quick: ['Review my budget', 'Suggest payment priorities', 'What might be missing?']
  },
  rsvp: {
    title: 'RSVP assistant',
    placeholder: 'Ask about guest follow-up or caterer headcount...',
    quick: ['Draft RSVP reminder', 'Summarize guest status', 'What headcount should I confirm?']
  },
  vendors: {
    title: 'Vendor assistant',
    placeholder: 'Ask for vendor questions, shortlist help, or message drafts...',
    quick: ['Draft message to a caterer', 'What should I ask a photographer?', 'Compare saved vendors']
  }
};

export function createMenuAssistantMessages(): Record<MenuAssistantTab, Message[]> {
  return {
    dashboard: [{ role: 'assistant', content: 'I can help read your dashboard and suggest what to focus on next.' }],
    checklist: [{ role: 'assistant', content: 'I can help create, refine, and prioritize checklist items for this majlis.' }],
    calendar: [{ role: 'assistant', content: 'I can help schedule appointments and suggest what should go into your calendar.' }],
    budget: [{ role: 'assistant', content: 'I can help review your budget, payment status, and possible missing categories.' }],
    rsvp: [{ role: 'assistant', content: 'I can help manage RSVP follow-ups, guest groups, and caterer headcount.' }],
    vendors: [{ role: 'assistant', content: 'I can help shortlist vendors and draft WhatsApp messages.' }]
  };
}

export function createMenuInputs(): Record<MenuAssistantTab, string> {
  return {
    dashboard: '',
    checklist: '',
    calendar: '',
    budget: '',
    rsvp: '',
    vendors: ''
  };
}

type MenuAssistantProps = {
  activeMenuTab: MenuAssistantTab;
  messages: Message[];
  input: string;
  loading: boolean;
  onOpenMainChat: () => void;
  onQuickPrompt: (prompt: string) => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export default function MenuAssistant({
  activeMenuTab,
  messages,
  input,
  loading,
  onOpenMainChat,
  onQuickPrompt,
  onInputChange,
  onSubmit
}: MenuAssistantProps) {
  const promptConfig = menuAssistantPrompts[activeMenuTab];

  return (
    <section className="menu-assistant" aria-label={`${promptConfig.title} chat`}>
      <div className="menu-assistant-header">
        <div>
          <p className="eyebrow">Menu chatbot</p>
          <h3>{promptConfig.title}</h3>
        </div>
        <button type="button" onClick={onOpenMainChat}>
          Open main chat
        </button>
      </div>

      <div className="menu-assistant-messages">
        {messages.slice(-3).map((message, index) => (
          <article key={`${activeMenuTab}-${message.role}-${index}`} className={`mini-message ${message.role}`}>
            {message.content || 'AI is typing...'}
          </article>
        ))}
      </div>

      <div className="menu-assistant-quick">
        {promptConfig.quick.map((prompt) => (
          <button key={prompt} type="button" onClick={() => onQuickPrompt(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <form className="menu-assistant-form" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={promptConfig.placeholder}
          aria-label={`${promptConfig.title} question`}
        />
        <button type="submit" disabled={loading || input.trim().length < 2}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
    </section>
  );
}
