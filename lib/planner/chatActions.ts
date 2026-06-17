import type { AppLanguage } from '../../components/planner/types';

/**
 * Model-driven planner actions. The AI appends a machine-readable block to its
 * reply when the user asks to add/change something concrete in their planner.
 * The client parses it, strips it from the visible text, and renders one-tap
 * confirm chips. Nothing is mutated until the user confirms.
 *
 * Block format (on its own lines, after the normal reply):
 *   <<<MM_ACTIONS
 *   [ { "type": "add_checklist_item", "text": "Tempah katering" } ]
 *   MM_ACTIONS>>>
 */

export const MM_ACTIONS_OPEN = '<<<MM_ACTIONS';
export const MM_ACTIONS_CLOSE = 'MM_ACTIONS>>>';

export type PlannerAction =
  | { type: 'add_checklist_item'; text: string; deadline?: string; phase?: string }
  | { type: 'add_budget_item'; category: string; planned?: number; note?: string }
  | { type: 'add_appointment'; title: string; date: string; time?: string; vendor?: string; location?: string }
  | { type: 'add_guest'; name: string; pax?: number; group?: string; phone?: string }
  | { type: 'update_budget'; category: string; planned?: number; actual?: number; paid?: number }
  | { type: 'complete_task'; text: string }
  | { type: 'update_appointment'; title: string; date?: string; time?: string; status?: 'planned' | 'confirmed' | 'done' }
  | { type: 'set_profile'; majlisDate?: string; negeri?: string; totalBudget?: number; guestTarget?: number };

export type PlannerActionType = PlannerAction['type'];

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

/** Validate one raw object into a typed action, or null if invalid. */
function validateAction(raw: unknown): PlannerAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const type = record.type;

  switch (type) {
    case 'add_checklist_item': {
      const text = asText(record.text);
      if (!text) return null;
      const action: PlannerAction = { type, text };
      if (isIsoDate(record.deadline)) action.deadline = record.deadline;
      const phase = asText(record.phase);
      if (phase) action.phase = phase;
      return action;
    }
    case 'add_budget_item': {
      const category = asText(record.category);
      if (!category) return null;
      const action: PlannerAction = { type, category };
      const planned = asNumber(record.planned);
      if (planned !== undefined) action.planned = planned;
      const note = asText(record.note);
      if (note) action.note = note;
      return action;
    }
    case 'add_appointment': {
      const title = asText(record.title);
      if (!title || !isIsoDate(record.date)) return null;
      const action: PlannerAction = { type, title, date: record.date };
      const time = asText(record.time);
      if (time && /^\d{1,2}:\d{2}$/.test(time)) action.time = time;
      const vendor = asText(record.vendor);
      if (vendor) action.vendor = vendor;
      const location = asText(record.location);
      if (location) action.location = location;
      return action;
    }
    case 'add_guest': {
      const name = asText(record.name);
      if (!name) return null;
      const action: PlannerAction = { type, name };
      const pax = asNumber(record.pax);
      if (pax !== undefined) action.pax = Math.round(pax);
      const group = asText(record.group);
      if (group) action.group = group;
      const phone = asText(record.phone);
      if (phone) action.phone = phone;
      return action;
    }
    case 'update_budget': {
      const category = asText(record.category);
      if (!category) return null;
      const planned = asNumber(record.planned);
      const actual = asNumber(record.actual);
      const paid = asNumber(record.paid);
      if (planned === undefined && actual === undefined && paid === undefined) return null;
      const action: PlannerAction = { type, category };
      if (planned !== undefined) action.planned = planned;
      if (actual !== undefined) action.actual = actual;
      if (paid !== undefined) action.paid = paid;
      return action;
    }
    case 'complete_task': {
      const text = asText(record.text);
      if (!text) return null;
      return { type, text };
    }
    case 'update_appointment': {
      const title = asText(record.title);
      if (!title) return null;
      const action: PlannerAction = { type, title };
      if (isIsoDate(record.date)) action.date = record.date;
      const time = asText(record.time);
      if (time && /^\d{1,2}:\d{2}$/.test(time)) action.time = time;
      const status = asText(record.status);
      if (status === 'planned' || status === 'confirmed' || status === 'done') action.status = status;
      return action;
    }
    case 'set_profile': {
      const action: PlannerAction = { type };
      let any = false;
      if (isIsoDate(record.majlisDate)) { action.majlisDate = record.majlisDate; any = true; }
      const negeri = asText(record.negeri);
      if (negeri) { action.negeri = negeri; any = true; }
      const totalBudget = asNumber(record.totalBudget);
      if (totalBudget !== undefined) { action.totalBudget = totalBudget; any = true; }
      const guestTarget = asNumber(record.guestTarget);
      if (guestTarget !== undefined) { action.guestTarget = Math.round(guestTarget); any = true; }
      return any ? action : null;
    }
    default:
      return null;
  }
}

/** Extract and validate planner actions from a full assistant answer. */
export function parseChatActions(text: string): PlannerAction[] {
  const openIndex = text.indexOf(MM_ACTIONS_OPEN);
  if (openIndex === -1) return [];
  const afterOpen = text.slice(openIndex + MM_ACTIONS_OPEN.length);
  const closeIndex = afterOpen.indexOf(MM_ACTIONS_CLOSE);
  const jsonRaw = (closeIndex === -1 ? afterOpen : afterOpen.slice(0, closeIndex)).trim();
  if (!jsonRaw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonRaw);
  } catch {
    // Tolerate a code-fence wrapper the model might add.
    const unfenced = jsonRaw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try {
      parsed = JSON.parse(unfenced);
    } catch {
      return [];
    }
  }

  const list = Array.isArray(parsed) ? parsed : [parsed];
  const actions: PlannerAction[] = [];
  for (const item of list) {
    const action = validateAction(item);
    if (action) actions.push(action);
  }
  return actions.slice(0, 12);
}

/**
 * Remove the action block from text for display/speech. Handles partial blocks
 * during streaming (open marker present but close marker not yet streamed).
 */
export function stripActionBlock(text: string): string {
  const openIndex = text.indexOf(MM_ACTIONS_OPEN);
  if (openIndex === -1) return text;
  const before = text.slice(0, openIndex);
  const afterOpen = text.slice(openIndex + MM_ACTIONS_OPEN.length);
  const closeIndex = afterOpen.indexOf(MM_ACTIONS_CLOSE);
  if (closeIndex === -1) return before.trimEnd();
  const after = afterOpen.slice(closeIndex + MM_ACTIONS_CLOSE.length);
  return `${before.trimEnd()}${after.trimStart() ? `\n${after.trimStart()}` : ''}`.trimEnd();
}

/** Human-readable summary for the confirm chip. */
export function summarizeAction(action: PlannerAction, language: AppLanguage): { kind: string; label: string } {
  const isMs = language === 'ms';
  switch (action.type) {
    case 'add_checklist_item':
      return {
        kind: isMs ? 'Tugas' : 'Task',
        label: action.deadline ? `${action.text} · ${action.deadline}` : action.text
      };
    case 'add_budget_item':
      return {
        kind: isMs ? 'Bajet' : 'Budget',
        label: action.planned ? `${action.category} · RM${action.planned.toLocaleString('en-MY')}` : action.category
      };
    case 'add_appointment':
      return {
        kind: isMs ? 'Appointment' : 'Appointment',
        label: `${action.title} · ${action.date}${action.time ? ` ${action.time}` : ''}`
      };
    case 'add_guest':
      return {
        kind: isMs ? 'Tetamu' : 'Guest',
        label: action.pax && action.pax > 1 ? `${action.name} (${action.pax} pax)` : action.name
      };
    case 'update_budget': {
      const parts: string[] = [];
      if (action.planned !== undefined) parts.push(`${isMs ? 'plan' : 'planned'} RM${action.planned.toLocaleString('en-MY')}`);
      if (action.actual !== undefined) parts.push(`${isMs ? 'kos' : 'actual'} RM${action.actual.toLocaleString('en-MY')}`);
      if (action.paid !== undefined) parts.push(`${isMs ? 'bayar' : 'paid'} RM${action.paid.toLocaleString('en-MY')}`);
      return { kind: isMs ? 'Kemas bajet' : 'Update budget', label: `${action.category} · ${parts.join(', ')}` };
    }
    case 'complete_task':
      return { kind: isMs ? 'Tanda siap' : 'Mark done', label: action.text };
    case 'update_appointment': {
      const parts: string[] = [];
      if (action.date) parts.push(action.date);
      if (action.time) parts.push(action.time);
      if (action.status) parts.push(action.status);
      return { kind: isMs ? 'Kemas appointment' : 'Update appt', label: parts.length ? `${action.title} · ${parts.join(' ')}` : action.title };
    }
    case 'set_profile': {
      const parts: string[] = [];
      if (action.majlisDate) parts.push(`${isMs ? 'tarikh' : 'date'} ${action.majlisDate}`);
      if (action.negeri) parts.push(action.negeri);
      if (action.totalBudget !== undefined) parts.push(`RM${action.totalBudget.toLocaleString('en-MY')}`);
      if (action.guestTarget !== undefined) parts.push(`${action.guestTarget} ${isMs ? 'tetamu' : 'guests'}`);
      return { kind: isMs ? 'Profil majlis' : 'Wedding profile', label: parts.join(' · ') };
    }
  }
}
