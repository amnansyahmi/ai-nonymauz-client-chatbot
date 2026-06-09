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

type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
};

type Appointment = {
  id: string;
  title: string;
  date: string;
  time?: string;
  note: string;
};

type CalendarDay = {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

type ActiveTab = 'chat' | 'checklist' | 'calendar';

const starterQuestions = [
  'What is your warranty policy?',
  'Macam mana nak book installation?',
  'Can I return an item after delivery?',
  'Create a checklist for installation booking.',
  'Add appointment on 20 June at 3pm for installation.'
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

function wantsChecklist(text: string) {
  return /\b(checklist|check list|todo|to-do|task list|senarai semak)\b/i.test(text);
}

function wantsAppointment(text: string) {
  const hasAction = /\b(add|create|make|set|schedule|book)\b/i.test(text);
  const hasCalendarTarget = /\b(appointment|meeting|calendar|janji temu|temujanji)\b/i.test(text);

  return hasAction && (hasCalendarTarget || Boolean(parseAppointmentDate(text)));
}

function cleanChecklistLine(line: string) {
  return line
    .replace(/^\s*(?:[-*]|\d+[.)]|\[[ xX]\])\s*/, '')
    .replace(/\*\*/g, '')
    .trim();
}

function checklistFromAnswer(answer: string) {
  const items = answer
    .split('\n')
    .map(cleanChecklistLine)
    .filter((line) => line.length > 3)
    .filter((line) => !/^demo mode aktif/i.test(line))
    .filter((line) => !/^sources?:/i.test(line))
    .slice(0, 12);

  return items.map((text, index) => ({
    id: `${Date.now()}-${index}`,
    text,
    completed: false
  }));
}

function fallbackChecklist(prompt: string): ChecklistItem[] {
  const lowerPrompt = prompt.toLowerCase();
  const installationItems = [
    'Collect customer name and contact number',
    'Confirm installation address and access details',
    'Confirm product, service, or package requested',
    'Choose preferred installation date and time',
    'Prepare photos, measurements, or site notes if needed',
    'Confirm quotation, payment status, and booking terms',
    'Send booking confirmation to the customer'
  ];
  const supportItems = [
    'Record the customer issue and affected order or account',
    'Check the relevant policy or SOP',
    'Ask for photos, receipts, or screenshots if needed',
    'Confirm the next action and expected timeline',
    'Escalate to a human support person if approval is required'
  ];
  const genericItems = [
    'Define the goal',
    'Gather required information',
    'List the main steps',
    'Assign an owner or next action',
    'Review for missing details',
    'Mark completed items as done'
  ];
  const sourceItems = /install|booking|book|pasang/.test(lowerPrompt)
    ? installationItems
    : /support|refund|return|warranty|issue|problem/.test(lowerPrompt)
      ? supportItems
      : genericItems;

  return sourceItems.map((text, index) => ({
    id: `${Date.now()}-${index}`,
    text,
    completed: false
  }));
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function parseAppointmentDate(text: string, baseDate = new Date()) {
  const lowerText = text.toLowerCase();

  if (/\btoday\b/i.test(text)) {
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  }

  if (/\btomorrow\b/i.test(text)) {
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
  }

  const isoMatch = text.match(/\b(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])(?:\/(20\d{2}))?\b/);
  if (slashMatch) {
    return new Date(
      slashMatch[3] ? Number(slashMatch[3]) : baseDate.getFullYear(),
      Number(slashMatch[2]) - 1,
      Number(slashMatch[1])
    );
  }

  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december'
  ];
  const monthPattern = months.join('|');
  const dayMonthMatch = lowerText.match(new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])\\s+(${monthPattern})(?:\\s+(20\\d{2}))?\\b`));
  const monthDayMatch = lowerText.match(new RegExp(`\\b(${monthPattern})\\s+(0?[1-9]|[12]\\d|3[01])(?:,?\\s+(20\\d{2}))?\\b`));

  if (dayMonthMatch) {
    return new Date(
      dayMonthMatch[3] ? Number(dayMonthMatch[3]) : baseDate.getFullYear(),
      months.indexOf(dayMonthMatch[2]),
      Number(dayMonthMatch[1])
    );
  }

  if (monthDayMatch) {
    return new Date(
      monthDayMatch[3] ? Number(monthDayMatch[3]) : baseDate.getFullYear(),
      months.indexOf(monthDayMatch[1]),
      Number(monthDayMatch[2])
    );
  }

  return null;
}

function parseAppointmentTime(text: string) {
  const timeMatch = text.match(/\b(?:at\s*)?([01]?\d|2[0-3]):([0-5]\d)\s*(am|pm)?\b/i) || text.match(/\bat\s+([01]?\d|2[0-3])\s*(am|pm)\b/i);
  if (!timeMatch) return undefined;

  const hour = timeMatch[1];
  const minutes = timeMatch[2] && !/am|pm/i.test(timeMatch[2]) ? timeMatch[2] : '00';
  const meridiemSource = /am|pm/i.test(timeMatch[2] || '') ? timeMatch[2] : timeMatch[3];
  const meridiem = meridiemSource ? ` ${meridiemSource.toUpperCase()}` : '';
  return `${hour}:${minutes}${meridiem}`;
}

function parseAppointment(text: string) {
  const date = parseAppointmentDate(text);
  if (!date) return null;

  const titleMatch = text.match(/\b(?:for|about|title|called)\s+(.+?)(?:\s+(?:on|at)\b|$)/i);
  const cleanedTitle = text
    .replace(/\b(create|add|make|set|schedule|book|appointment|meeting|calendar|for|on|at|today|tomorrow)\b/gi, ' ')
    .replace(/\b20\d{2}-\d{1,2}-\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/20\d{2})?\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const title = titleMatch?.[1]?.trim() || cleanedTitle || 'Appointment';

  return {
    id: `${Date.now()}`,
    title: title.length > 60 ? `${title.slice(0, 57)}...` : title,
    date: dateKey(date),
    time: parseAppointmentTime(text),
    note: text
  };
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstDay.getDay());
  const todayKey = dateKey(new Date());

  return Array.from({ length: 42 }, (_, index): CalendarDay => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const key = dateKey(date);

    return {
      date,
      key,
      isCurrentMonth: date.getMonth() === month,
      isToday: key === todayKey
    };
  });
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! Saya AI support assistant. Tanya saya tentang warranty, refund, installation booking, support escalation, atau company FAQ.'
    }
  ]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [checklistTitle, setChecklistTitle] = useState('Checklist');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentAssistantActive, setAppointmentAssistantActive] = useState(false);
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
    const shouldCreateChecklist = wantsChecklist(trimmed);
    const shouldCreateAppointment = appointmentAssistantActive || wantsAppointment(trimmed);

    if (shouldCreateChecklist) {
      setActiveTab('checklist');
      setChecklistTitle(trimmed.length > 64 ? `${trimmed.slice(0, 61)}...` : trimmed);
      setChecklistItems([]);
    }

    if (shouldCreateAppointment) {
      setAppointmentAssistantActive(false);
    }

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

      if (shouldCreateChecklist) {
        const generatedItems = checklistFromAnswer(fullAnswer);
        setChecklistItems(generatedItems.length > 0 ? generatedItems : fallbackChecklist(trimmed));
      }

      if (shouldCreateAppointment) {
        const appointment = parseAppointment(trimmed);
        if (appointment) {
          setAppointments((current) => [...current, appointment]);
          setCalendarMonth(new Date(`${appointment.date}T00:00:00`));
          setActiveTab('calendar');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setMessages([...nextMessages, { role: 'assistant', content: `Sorry, ada error: ${message}` }]);
      if (shouldCreateChecklist) {
        setChecklistItems(fallbackChecklist(trimmed));
      }
      if (shouldCreateAppointment) {
        const appointment = parseAppointment(trimmed);
        if (appointment) {
          setAppointments((current) => [...current, appointment]);
          setCalendarMonth(new Date(`${appointment.date}T00:00:00`));
          setActiveTab('calendar');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask(input);
  }

  function toggleChecklistItem(id: string) {
    setChecklistItems((current) =>
      current.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  }

  function removeChecklistItem(id: string) {
    setChecklistItems((current) => current.filter((item) => item.id !== id));
  }

  function addChecklistItem(event: FormEvent) {
    event.preventDefault();
    const text = newChecklistItem.trim();
    if (!text) return;

    setChecklistItems((current) => [...current, { id: `${Date.now()}-${current.length}`, text, completed: false }]);
    setNewChecklistItem('');
  }

  function startAppointmentAssistant() {
    setAppointmentAssistantActive(true);
    setActiveTab('chat');
    setInput('Create an appointment on ');
    setMessages((current) => [
      ...current,
      {
        role: 'assistant',
        content: 'Sure. Tell me the appointment date, time, and title. Example: Create an appointment on 20 June at 3pm for installation.'
      }
    ]);
  }

  function changeCalendarMonth(direction: -1 | 1) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  function removeAppointment(id: string) {
    setAppointments((current) => current.filter((appointment) => appointment.id !== id));
  }

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const calendarDays = getCalendarDays(calendarMonth);
  const selectedMonthAppointments = appointments
    .filter((appointment) => {
      const appointmentDate = new Date(`${appointment.date}T00:00:00`);
      return (
        appointmentDate.getMonth() === calendarMonth.getMonth() &&
        appointmentDate.getFullYear() === calendarMonth.getFullYear()
      );
    })
    .sort((first, second) => first.date.localeCompare(second.date));

  return (
    <section className="chat-shell" aria-label="AI-nonymauz client chatbot demo">
      <div className="chat-header">
        <div>
          <p className="eyebrow">AI-nonymauz Client System</p>
          <h2>Company Knowledge + Website Support Chatbot</h2>
        </div>
        <span className="status-dot">Live demo</span>
      </div>

      <div className="chat-tabs" role="tablist" aria-label="Chat tools">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'chat'}
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'checklist'}
          className={activeTab === 'checklist' ? 'active' : ''}
          onClick={() => setActiveTab('checklist')}
        >
          Checklist
          {checklistItems.length > 0 ? <span>{completedCount}/{checklistItems.length}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'calendar'}
          className={activeTab === 'calendar' ? 'active' : ''}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
          {appointments.length > 0 ? <span>{appointments.length}</span> : null}
        </button>
      </div>

      <div className="starter-grid">
        {starterQuestions.map((question) => (
          <button key={question} type="button" onClick={() => ask(question)} disabled={loading}>
            {question}
          </button>
        ))}
      </div>

      {activeTab === 'chat' ? (
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
      ) : activeTab === 'checklist' ? (
        <div className="checklist-panel">
          <div className="checklist-summary">
            <div>
              <p className="eyebrow">Interactive checklist</p>
              <h3>{checklistTitle}</h3>
            </div>
            <span>{completedCount}/{checklistItems.length} done</span>
          </div>

          {loading && checklistItems.length === 0 ? <p className="typing">Creating checklist...</p> : null}

          {checklistItems.length > 0 ? (
            <ul className="checklist-items">
              {checklistItems.map((item) => (
                <li key={item.id} className={item.completed ? 'done' : ''}>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistItem(item.id)}
                    />
                    <span>{item.text}</span>
                  </label>
                  <button type="button" aria-label={`Remove ${item.text}`} onClick={() => removeChecklistItem(item.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <p className="empty-state">Ask the chat to create a checklist and it will appear here.</p>
          ) : null}

          <form className="checklist-form" onSubmit={addChecklistItem}>
            <input
              value={newChecklistItem}
              onChange={(event) => setNewChecklistItem(event.target.value)}
              placeholder="Add checklist item..."
              aria-label="New checklist item"
            />
            <button type="submit" disabled={newChecklistItem.trim().length === 0}>
              Add
            </button>
          </form>
        </div>
      ) : (
        <div className="calendar-panel">
          <div className="calendar-toolbar">
            <div>
              <p className="eyebrow">Calendar menu</p>
              <h3>{monthLabel(calendarMonth)}</h3>
            </div>
            <div className="calendar-actions">
              <button type="button" onClick={() => changeCalendarMonth(-1)} aria-label="Previous month">
                &lt;
              </button>
              <button type="button" onClick={() => setCalendarMonth(new Date())}>
                Today
              </button>
              <button type="button" onClick={() => changeCalendarMonth(1)} aria-label="Next month">
                &gt;
              </button>
              <button type="button" className="primary-action" onClick={startAppointmentAssistant}>
                AI Add
              </button>
            </div>
          </div>

          <div className="calendar-grid" aria-label={`${monthLabel(calendarMonth)} calendar`}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
            {calendarDays.map((day) => {
              const dayAppointments = appointments.filter((appointment) => appointment.date === day.key);

              return (
                <div
                  key={day.key}
                  className={`calendar-day ${day.isCurrentMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''}`}
                >
                  <span className="calendar-date">{day.date.getDate()}</span>
                  {dayAppointments.slice(0, 2).map((appointment) => (
                    <span key={appointment.id} className="appointment-chip">
                      {appointment.time ? `${appointment.time} ` : ''}
                      {appointment.title}
                    </span>
                  ))}
                  {dayAppointments.length > 2 ? <span className="appointment-more">+{dayAppointments.length - 2}</span> : null}
                </div>
              );
            })}
          </div>

          <div className="appointment-list">
            <div className="appointment-list-header">
              <h4>This month</h4>
              <span>{selectedMonthAppointments.length} appointment{selectedMonthAppointments.length === 1 ? '' : 's'}</span>
            </div>
            {selectedMonthAppointments.length > 0 ? (
              selectedMonthAppointments.map((appointment) => (
                <article key={appointment.id} className="appointment-item">
                  <div>
                    <strong>{appointment.title}</strong>
                    <p>
                      {appointment.date}
                      {appointment.time ? ` at ${appointment.time}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeAppointment(appointment.id)}>
                    Remove
                  </button>
                </article>
              ))
            ) : (
              <p className="empty-state">No appointments yet. Use AI Add, then tell the chat what to schedule.</p>
            )}
          </div>
        </div>
      )}

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
