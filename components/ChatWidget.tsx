'use client';

import { FormEvent, RefObject, useEffect, useRef, useState } from 'react';
import type { Message } from './planner/types';
import { summarizeAction, type PlannerAction } from '@/lib/planner/chatActions';
import Composer from './ui/Composer';
import Markdown from './ui/Markdown';
import StopGeneratingButton from './ai/StopGeneratingButton';
import HighlightToAsk from './ai/HighlightToAsk';
import InlineCitations from './ai/InlineCitations';
import type { AttachedImage } from '@/lib/ai/imageUpload';

type ChatWidgetProps = {
  messages: Message[];
  input: string;
  loading?: boolean;
  placeholder: string;
  submitLabel?: string;
  emptyTypingLabel?: string;
  inputAriaLabel?: string;
  language?: 'ms' | 'en';
  dictateLabel?: string;
  voiceLabel?: string;
  commandSuggestions?: string[];
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  showImageUpload?: boolean;
  attachedImage?: AttachedImage | null;
  onInputChange: (value: string) => void;
  onCommandSuggestion?: (value: string) => void;
  onVoiceMode?: () => void;
  onApplyActions?: (messageIndex: number, actions: PlannerAction[]) => void;
  onDismissActions?: (messageIndex: number) => void;
  onClarifyReply?: (messageIndex: number, reply: string) => void;
  onAttachImage?: (image: AttachedImage) => void;
  onClearImage?: () => void;
  onImageError?: (message: string) => void;
  onStopGenerating?: () => void;
  onHighlightAsk?: (prompt: string) => void;
  onNavigate?: (tab: string) => void;
  onSubmit: (event: FormEvent) => void;
};

type ActionPanelProps = {
  messageIndex: number;
  actions: PlannerAction[];
  state?: Message['actionsState'];
  language: 'ms' | 'en';
  onApply?: (messageIndex: number, actions: PlannerAction[]) => void;
  onDismiss?: (messageIndex: number) => void;
};

function getActionIcon(type: PlannerAction['type']): string {
  switch (type) {
    case 'add_budget_item':
    case 'update_budget':
      return 'RM';
    case 'add_appointment':
    case 'update_appointment':
      return 'Cal';
    case 'add_guest':
      return 'Pax';
    case 'set_profile':
      return 'Set';
    case 'add_checklist_item':
    case 'complete_task':
    default:
      return 'OK';
  }
}

function ActionPanel({ messageIndex, actions, state, language, onApply, onDismiss }: ActionPanelProps) {
  const isMs = language === 'ms';
  if (state === 'dismissed') return null;
  const applied = state === 'applied';

  return (
    <div className={`chat-actions${applied ? ' is-applied' : ''}`}>
      <span className="chat-actions__title">
        {applied
          ? isMs ? 'Ditambah ke planner' : 'Added to your planner'
          : isMs ? 'MajlisMate boleh tambah ini:' : 'MajlisMate can add these:'}
      </span>
      <ul className="chat-actions__list">
        {actions.map((action, i) => {
          const { kind, label } = summarizeAction(action, language);
          return (
            <li key={i} className={`chat-action-chip type-${action.type}`}>
              <span className="chat-action-chip__icon" aria-hidden="true">{getActionIcon(action.type)}</span>
              <span className="chat-action-chip__kind">{kind}</span>
              <span className="chat-action-chip__label">{label}</span>
            </li>
          );
        })}
      </ul>
      {!applied ? (
        <div className="chat-actions__buttons">
          <button
            type="button"
            className="chat-actions__apply"
            onClick={() => onApply?.(messageIndex, actions)}
          >
            {actions.length > 1
              ? isMs ? `Tambah semua (${actions.length})` : `Add all (${actions.length})`
              : isMs ? 'Tambah' : 'Add'}
          </button>
          <button
            type="button"
            className="chat-actions__dismiss"
            onClick={() => onDismiss?.(messageIndex)}
          >
            {isMs ? 'Abaikan' : 'Dismiss'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

type ClarifyChipsProps = {
  messageIndex: number;
  options: string[];
  answered?: boolean;
  language: 'ms' | 'en';
  disabled?: boolean;
  onReply?: (messageIndex: number, reply: string) => void;
};

function ClarifyChips({ messageIndex, options, answered, language, disabled, onReply }: ClarifyChipsProps) {
  if (answered) return null;
  const isMs = language === 'ms';
  return (
    <div className="chat-clarify" role="group" aria-label={isMs ? 'Pilihan jawapan pantas' : 'Quick reply options'}>
      {options.map((option, i) => (
        <button
          key={i}
          type="button"
          className="chat-clarify__chip"
          disabled={disabled}
          onClick={() => onReply?.(messageIndex, option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

type MessageBubbleProps = {
  message: Message;
  isStreaming: boolean;
  emptyTypingLabel: string;
  language?: 'ms' | 'en';
};

function MessageBubble({ message, isStreaming, emptyTypingLabel, language = 'ms' }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="bubble">
      {message.content ? (
        <Markdown content={message.content} streaming={isStreaming} />
      ) : (
        <div className="typing-indicator" role="status" aria-label={emptyTypingLabel}>
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      )}
      {message.sources && message.sources.length > 0 ? (
        <InlineCitations sources={message.sources} language={language} />
      ) : null}
      {message.content && !isStreaming ? (
        <div className="bubble-actions">
          <button
            type="button"
            className={`bubble-copy-btn${copied ? ' copied' : ''}`}
            aria-label={copied ? 'Copied' : 'Copy message'}
            onClick={handleCopy}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function ChatWidget({
  messages,
  input,
  loading = false,
  placeholder,
  submitLabel = 'Send',
  emptyTypingLabel = 'AI is typing...',
  inputAriaLabel = 'Question',
  language = 'ms',
  dictateLabel = 'Dictate',
  voiceLabel = 'Voice',
  commandSuggestions = [],
  messagesEndRef,
  showImageUpload = false,
  attachedImage = null,
  onInputChange,
  onCommandSuggestion,
  onVoiceMode,
  onApplyActions,
  onDismissActions,
  onClarifyReply,
  onAttachImage,
  onClearImage,
  onImageError,
  onStopGenerating,
  onHighlightAsk,
  onNavigate,
  onSubmit
}: ChatWidgetProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handle = () => {
      setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
    };
    el.addEventListener('scroll', handle, { passive: true });
    handle();
    return () => el.removeEventListener('scroll', handle);
    // Depend on the count (a stable primitive), not the array reference, so a
    // caller passing a fresh array each render can't re-run this every render.
  }, [messages.length]);

  function scrollToBottom() {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      <div className="messages" ref={messagesContainerRef}>
        {messages.map((message, index) => {
          const isStreaming = loading && message.role === 'assistant' && index === messages.length - 1;
          return (
            <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
              {message.role === 'assistant' ? (
                <div className="assistant-stack">
                  <MessageBubble
                    message={message}
                    isStreaming={isStreaming}
                    emptyTypingLabel={emptyTypingLabel}
                    language={language}
                  />
                  {message.actions && message.actions.length > 0 && !isStreaming ? (
                    <ActionPanel
                      messageIndex={index}
                      actions={message.actions}
                      state={message.actionsState}
                      language={language}
                      onApply={onApplyActions}
                      onDismiss={onDismissActions}
                    />
                  ) : null}
                  {message.clarify && message.clarify.length > 0 && !isStreaming ? (
                    <ClarifyChips
                      messageIndex={index}
                      options={message.clarify}
                      answered={message.clarifyAnswered}
                      language={language}
                      disabled={loading}
                      onReply={onClarifyReply}
                    />
                  ) : null}
                  {message.navTab && !isStreaming ? (
                    <div className="chat-nav-hint">
                      <button
                        type="button"
                        className="chat-nav-hint__btn"
                        onClick={() => onNavigate?.(message.navTab!)}
                      >
                        <span className="chat-nav-hint__arrow" aria-hidden="true">↗</span>
                        {message.navLabel ?? (language === 'ms' ? 'Buka tab' : 'Open tab')}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="bubble">
                  {message.content.split('\n').map((line, li) => (
                    <p key={li}>{line || ' '}</p>
                  ))}
                </div>
              )}
            </article>
          );
        })}
        {messagesEndRef ? <div ref={messagesEndRef} /> : null}
        {showScrollBtn ? (
          <button
            type="button"
            className="scroll-to-bottom-btn"
            aria-label={language === 'ms' ? 'Tatal ke bawah' : 'Scroll to bottom'}
            onClick={scrollToBottom}
          >
            <ChevronDownIcon />
          </button>
        ) : null}
      </div>

      {loading && onStopGenerating ? (
        <div className="chat-stop-wrapper">
          <StopGeneratingButton visible language={language} onStop={onStopGenerating} />
        </div>
      ) : null}

      {onHighlightAsk ? (
        <HighlightToAsk containerRef={messagesContainerRef} language={language} onAsk={onHighlightAsk} disabled={loading} />
      ) : null}

      <Composer
        input={input}
        placeholder={placeholder}
        inputAriaLabel={inputAriaLabel}
        submitLabel={submitLabel}
        dictateLabel={dictateLabel}
        voiceLabel={voiceLabel}
        language={language}
        disabled={loading}
        commandSuggestions={commandSuggestions}
        showImageUpload={showImageUpload}
        attachedImage={attachedImage}
        onCommandSuggestion={onCommandSuggestion}
        onInputChange={onInputChange}
        onVoiceMode={onVoiceMode}
        onAttachImage={onAttachImage}
        onClearImage={onClearImage}
        onImageError={onImageError}
        onSubmit={onSubmit}
      />
    </>
  );
}
