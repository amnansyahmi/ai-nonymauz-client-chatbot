'use client';

import { FormEvent, RefObject, useEffect, useRef, useState } from 'react';
import type { Message } from './planner/types';
import { summarizeAction, type PlannerAction } from '../lib/planner/chatActions';
import Composer from './ui/Composer';
import Markdown from './ui/Markdown';
import StopGeneratingButton from './ai/StopGeneratingButton';
import HighlightToAsk from './ai/HighlightToAsk';
import InlineCitations from './ai/InlineCitations';
import type { AttachedImage } from '../lib/ai/imageUpload';

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
  onAttachImage?: (image: AttachedImage) => void;
  onClearImage?: () => void;
  onImageError?: (message: string) => void;
  onStopGenerating?: () => void;
  onHighlightAsk?: (prompt: string) => void;
  onSubmit: (event: FormEvent) => void;
};

const ACTION_ICON: Record<PlannerAction['type'], string> = {
  add_checklist_item: '✓',
  add_budget_item: 'RM',
  add_appointment: '📅',
  add_guest: '👤',
  update_budget: 'RM',
  complete_task: '✓',
  update_appointment: '📅',
  set_profile: '💍'
};

type ActionPanelProps = {
  messageIndex: number;
  actions: PlannerAction[];
  state?: Message['actionsState'];
  language: 'ms' | 'en';
  onApply?: (messageIndex: number, actions: PlannerAction[]) => void;
  onDismiss?: (messageIndex: number) => void;
};

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
              <span className="chat-action-chip__icon" aria-hidden="true">{ACTION_ICON[action.type]}</span>
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

function AssistantAvatar() {
  return (
    <div className="msg-avatar" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M12 4V2M8 4h8a4 4 0 0 1 4 4v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8a4 4 0 0 1 4-4Z" />
        <path d="M8 12h.01M16 12h.01M9 16h6" />
      </svg>
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
        <p className="typing">{emptyTypingLabel}</p>
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
  onAttachImage,
  onClearImage,
  onImageError,
  onStopGenerating,
  onHighlightAsk,
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
  }, [messages]);

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
              {message.role === 'assistant' && <AssistantAvatar />}
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
