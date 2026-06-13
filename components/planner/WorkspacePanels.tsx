import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import type { ActivityItem, Appointment, BudgetItem, Guest, PlannerProfile, Vendor } from './types';
import { money, rsvpLabel, statusLabel } from './utils';

type DashboardPanelProps = {
  plannerProfile: PlannerProfile;
  daysLeft: number | null;
  planningProgress: number;
  completedCount: number;
  totalChecklistItems: number;
  totalPlanned: number;
  totalActual: number;
  totalPaid: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  createDefaultChecklist: () => void;
  urgentChecklist: Array<{ id: string; text: string; deadline?: string; phase?: string }>;
  fallbackUrgent: string[];
  activity: ActivityItem[];
  nextAppointment?: Appointment;
  budgetAlert: string;
  planningPhase: string;
  smartReminders: string[];
  onAskToday: () => void;
};

export function DashboardPanel({
  plannerProfile,
  daysLeft,
  planningProgress,
  completedCount,
  totalChecklistItems,
  totalPlanned,
  totalActual,
  totalPaid,
  confirmedGuests,
  pendingGuests,
  declinedGuests,
  createDefaultChecklist,
  urgentChecklist,
  fallbackUrgent,
  activity,
  nextAppointment,
  budgetAlert,
  planningPhase,
  smartReminders,
  onAskToday
}: DashboardPanelProps) {
  return (
    <div className="dashboard-panel">
      <section className="today-command-center" aria-label="Today planning overview">
        <div className="today-hero-copy">
          <p className="eyebrow">Today view</p>
          <h3>What needs attention now</h3>
          <p>Start with the next task, next appointment, and any budget pressure before opening the detailed menus.</p>
        </div>
        <button type="button" onClick={onAskToday}>Ask MajlisMate today</button>
        <div className="today-card-grid">
          <article>
            <span>Next task</span>
            <strong>{urgentChecklist[0]?.text || fallbackUrgent[0]}</strong>
            <p>{urgentChecklist[0]?.deadline ? `Due ${urgentChecklist[0].deadline}` : urgentChecklist[0]?.phase || 'Recommended now'}</p>
          </article>
          <article>
            <span>Next appointment</span>
            <strong>{nextAppointment ? nextAppointment.title : 'No appointment yet'}</strong>
            <p>{nextAppointment ? `${nextAppointment.date}${nextAppointment.time ? ` at ${nextAppointment.time}` : ''}` : 'Schedule vendor follow-ups or payment reminders.'}</p>
          </article>
          <article>
            <span>Budget signal</span>
            <strong>{budgetAlert}</strong>
            <p>Review planned, actual, paid, and balance.</p>
          </article>
          <article>
            <span>Planning phase</span>
            <strong>{planningPhase}</strong>
            <p>{plannerProfile.majlisDate || 'Set wedding date in settings.'}</p>
          </article>
        </div>
      </section>

      <section className="planner-section reminder-section">
        <div className="section-row">
          <div>
            <p className="eyebrow">Smart reminders</p>
            <h3>Recommended focus</h3>
          </div>
        </div>
        <ul className="action-list reminder-list">
          {smartReminders.map((reminder) => (
            <li key={reminder}>
              <strong>{reminder}</strong>
              <span>Suggested by current planner data</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="dashboard-grid">
        <article className="metric-card hero-metric">
          <span>Countdown</span>
          <strong>{daysLeft === null ? 'Set date' : daysLeft >= 0 ? `${daysLeft} days` : 'Majlis passed'}</strong>
          <p>{plannerProfile.majlisDate || 'Add your majlis date to unlock timeline alerts.'}</p>
        </article>
        <article className="metric-card">
          <span>Progress</span>
          <strong>{planningProgress}%</strong>
          <div className="progress-track"><span style={{ width: `${planningProgress}%` }} /></div>
          <p>{completedCount}/{totalChecklistItems} checklist items done</p>
        </article>
        <article className="metric-card">
          <span>Budget</span>
          <strong>{money(totalPaid)}</strong>
          <p>{money(totalPlanned)} planned, {money(totalActual)} actual</p>
        </article>
        <article className="metric-card">
          <span>RSVP</span>
          <strong>{confirmedGuests}</strong>
          <p>{pendingGuests} pending, {declinedGuests} declined</p>
        </article>
      </div>

      <div className="planner-columns">
        <section className="planner-section">
          <div className="section-row">
            <div>
              <p className="eyebrow">Deadline-aware</p>
              <h3>Urgent actions</h3>
            </div>
            <button type="button" onClick={createDefaultChecklist}>Generate default checklist</button>
          </div>
          <ul className="action-list">
            {urgentChecklist.length > 0
              ? urgentChecklist.map((item) => (
                  <li key={item.id}>
                    <strong>{item.text}</strong>
                    <span>{item.deadline ? `Due ${item.deadline}` : item.phase || 'Planning'}</span>
                  </li>
                ))
              : fallbackUrgent.map((item) => (
                  <li key={item}>
                    <strong>{item}</strong>
                    <span>Recommended now</span>
                  </li>
                ))}
          </ul>
        </section>

        <section className="planner-section">
          <div className="section-row">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h3>Latest changes</h3>
            </div>
          </div>
          {activity.length > 0 ? (
            <ul className="activity-list">
              {activity.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <span>{new Date(item.time).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <strong>{item.text}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Your latest planner updates will appear here.</p>
          )}
        </section>
      </div>
    </div>
  );
}

type BudgetPanelProps = {
  budgetItems: BudgetItem[];
  budgetSuggestions: BudgetItem[];
  plannerProfile: PlannerProfile;
  budgetDraft: BudgetItem;
  setBudgetDraft: Dispatch<SetStateAction<BudgetItem>>;
  addBudgetItem: (event: FormEvent) => void;
  addSuggestedBudgetItem: (item: BudgetItem) => void;
  updateBudgetItem: (id: string, patch: Partial<BudgetItem>) => void;
  removeBudgetItem: (id: string) => void;
  exportBudgetCsv: () => void;
  totalPlanned: number;
  totalActual: number;
  totalPaid: number;
};

export function BudgetPanel({
  budgetItems,
  budgetSuggestions,
  plannerProfile,
  budgetDraft,
  setBudgetDraft,
  addBudgetItem,
  addSuggestedBudgetItem,
  updateBudgetItem,
  removeBudgetItem,
  exportBudgetCsv,
  totalPlanned,
  totalActual,
  totalPaid
}: BudgetPanelProps) {
  const [budgetView, setBudgetView] = useState<'all' | 'attention' | 'unpaid' | 'done'>('all');
  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);
  const [isBudgetAddOpen, setIsBudgetAddOpen] = useState(false);
  const remainingToPay = Math.max(totalActual - totalPaid, 0);
  const plannedBalance = totalPlanned - totalActual;
  const paidProgress = totalActual > 0 ? Math.min(100, Math.round((totalPaid / totalActual) * 100)) : 0;
  const overBudgetItems = budgetItems.filter((item) => item.actual > item.planned && item.planned > 0);
  const activeBudgetItems = budgetItems.filter((item) => item.status !== 'done').length;
  const unpaidItems = budgetItems.filter((item) => Math.max(item.actual - item.paid, 0) > 0);
  const completedBudgetItems = budgetItems.filter((item) => item.status === 'done');
  const budgetViewOptions = [
    { value: 'all' as const, label: 'All', count: budgetItems.length },
    { value: 'attention' as const, label: 'Needs attention', count: overBudgetItems.length },
    { value: 'unpaid' as const, label: 'To pay', count: unpaidItems.length },
    { value: 'done' as const, label: 'Done', count: completedBudgetItems.length }
  ];
  const filteredBudgetItems = budgetItems.filter((item) => {
    if (budgetView === 'attention') return item.actual > item.planned && item.planned > 0;
    if (budgetView === 'unpaid') return Math.max(item.actual - item.paid, 0) > 0;
    if (budgetView === 'done') return item.status === 'done';
    return true;
  });
  const budgetHealth = overBudgetItems.length > 0
    ? `${overBudgetItems.length} over budget`
    : totalActual > 0
      ? 'On track'
      : 'Ready to plan';
  const largestActualItem = [...budgetItems].sort((first, second) => second.actual - first.actual)[0];
  const paidBarWidth = totalActual > 0 ? paidProgress : 0;
  const normalizedBudgetCategories = budgetItems.map((item) => item.category.trim().toLowerCase());
  const missingSuggestions = budgetSuggestions.filter((item) => !normalizedBudgetCategories.includes(item.category.trim().toLowerCase())).slice(0, 6);
  const suggestionBase = Math.max(plannerProfile.totalBudget, totalPlanned, totalActual, 30000);
  const budgetAllocation = [
    { label: 'Venue / Dewan', percent: 0.24, hint: 'Hall, room, basic facilities, parking' },
    { label: 'Catering', percent: 0.34, hint: 'Food usually scales with guest count' },
    { label: 'Pelamin & Dekorasi', percent: 0.1, hint: 'Backdrop, florals, walkway, ambience' },
    { label: 'Baju / Andaman', percent: 0.1, hint: 'Attire, makeup, fitting, accessories' },
    { label: 'Photo & Video', percent: 0.1, hint: 'Coverage, editing, album, highlight video' },
    { label: 'Contingency', percent: 0.07, hint: 'Buffer for last-minute changes' },
    { label: 'Others', percent: 0.05, hint: 'Door gifts, transport, stationery, crew meals' }
  ];
  const findBudgetByAllocation = (label: string) => {
    const normalizedLabel = label.toLowerCase();
    return budgetItems.find((item) => {
      const category = item.category.toLowerCase();
      if (normalizedLabel.includes('baju')) return category.includes('baju') || category.includes('andaman') || category.includes('mua');
      if (normalizedLabel.includes('photo')) return category.includes('photo') || category.includes('video') || category.includes('foto');
      if (normalizedLabel.includes('others')) return category.includes('cenderahati') || category.includes('hantaran') || category.includes('transport');
      return normalizedLabel.split('/')[0].trim().split(' ')[0] && category.includes(normalizedLabel.split('/')[0].trim().toLowerCase());
    });
  };
  const applyBudgetAllocation = () => {
    budgetAllocation.forEach((allocation) => {
      const matchedItem = findBudgetByAllocation(allocation.label);
      if (matchedItem) {
        updateBudgetItem(matchedItem.id, { planned: Math.round(suggestionBase * allocation.percent) });
      }
    });
  };

  return (
    <div className="planner-panel budget-panel budget-command-center">
      <div className="planner-panel-header budget-hero-modern">
        <div>
          <p className="eyebrow">Budget tracker</p>
          <h3>Wedding budget overview</h3>
          <p>See what is planned, what has changed, and what still needs payment without editing every row at once.</p>
        </div>
        <div className="budget-hero-actions">
          <span className={overBudgetItems.length > 0 ? 'budget-health warning' : 'budget-health'}>{budgetHealth}</span>
          <button type="button" className="primary-action" onClick={() => setIsBudgetAddOpen(true)}>Add category</button>
          <button type="button" className="utility-action" onClick={exportBudgetCsv} disabled={budgetItems.length === 0}>Export CSV</button>
        </div>
      </div>

      <div className="budget-focus-grid" aria-label="Budget summary">
        <article className="budget-focus-card">
          <span>Total actual</span>
          <strong>{money(totalActual)}</strong>
          <p>{plannedBalance >= 0 ? `${money(plannedBalance)} within plan` : `${money(Math.abs(plannedBalance))} over planned budget`}</p>
          <div className="budget-meter" aria-label={`${paidProgress}% paid`}>
            <span style={{ width: `${paidBarWidth}%` }} />
          </div>
          <small>{paidProgress}% paid</small>
        </article>

        <article>
          <span>Planned</span>
          <strong>{money(totalPlanned)}</strong>
          <p>{budgetItems.length} categories</p>
        </article>

        <article>
          <span>Paid</span>
          <strong>{money(totalPaid)}</strong>
          <p>{completedBudgetItems.length} completed</p>
        </article>

        <article>
          <span>To pay</span>
          <strong>{money(remainingToPay)}</strong>
          <p>{activeBudgetItems} active categor{activeBudgetItems === 1 ? 'y' : 'ies'}</p>
        </article>
      </div>

      <div className="budget-workspace">
        <section className="budget-main">
          <div className="budget-toolbar">
            <div className="budget-view-tabs" role="tablist" aria-label="Budget views">
              {budgetViewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={budgetView === option.value}
                  className={budgetView === option.value ? 'active' : ''}
                  onClick={() => setBudgetView(option.value)}
                >
                  {option.label}
                  <span>{option.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="budget-list-modern">
            {filteredBudgetItems.length > 0 ? filteredBudgetItems.map((item) => {
              const remaining = Math.max(item.actual - item.paid, 0);
              const isExpanded = expandedBudgetId === item.id;
              const isOverBudget = item.actual > item.planned && item.planned > 0;
              const itemProgress = item.actual > 0 ? Math.min(100, Math.round((item.paid / item.actual) * 100)) : 0;

              return (
                <article key={item.id} className={`budget-row-card ${isExpanded ? 'expanded' : ''} ${isOverBudget ? 'warning' : ''}`}>
                  <button
                    type="button"
                    className="budget-row-summary"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedBudgetId(isExpanded ? null : item.id)}
                  >
                    <span className="budget-category-dot" aria-hidden="true" />
                    <span className="budget-row-title">
                      <strong>{item.category}</strong>
                      <small>{item.note || (remaining > 0 ? `${money(remaining)} left to pay` : 'No note yet')}</small>
                    </span>
                    <span className="budget-row-amount">
                      <strong>{money(item.actual || item.planned)}</strong>
                      <small>{itemProgress}% paid</small>
                    </span>
                    <span className={`budget-status ${item.status}`}>{statusLabel(item.status)}</span>
                  </button>

                  <div className="budget-row-meter">
                    <span style={{ width: `${itemProgress}%` }} />
                  </div>

                  {isExpanded ? (
                    <div className="budget-edit-panel">
                      <label>
                        <span>Category</span>
                        <input value={item.category} onChange={(event) => updateBudgetItem(item.id, { category: event.target.value })} aria-label="Budget category" />
                      </label>
                      <label>
                        <span>Planned</span>
                        <input type="number" value={item.planned} onChange={(event) => updateBudgetItem(item.id, { planned: Number(event.target.value) })} aria-label="Planned budget" />
                      </label>
                      <label>
                        <span>Actual</span>
                        <input type="number" value={item.actual} onChange={(event) => updateBudgetItem(item.id, { actual: Number(event.target.value) })} aria-label="Actual cost" />
                      </label>
                      <label>
                        <span>Paid</span>
                        <input type="number" value={item.paid} onChange={(event) => updateBudgetItem(item.id, { paid: Number(event.target.value) })} aria-label="Paid amount" />
                      </label>
                      <label>
                        <span>Status</span>
                        <select value={item.status} onChange={(event) => updateBudgetItem(item.id, { status: event.target.value as BudgetItem['status'] })} aria-label="Budget status">
                          <option value="not-started">Belum Mula</option>
                          <option value="in-progress">Sedang Diurus</option>
                          <option value="done">Selesai</option>
                        </select>
                      </label>
                      <label className="budget-note-field">
                        <span>Note</span>
                        <input value={item.note} onChange={(event) => updateBudgetItem(item.id, { note: event.target.value })} placeholder="Vendor, due date, or payment note..." aria-label="Budget note" />
                      </label>
                      {isOverBudget ? <p className="budget-warning-text">Over budget by {money(item.actual - item.planned)}</p> : null}
                      <div className="budget-edit-actions">
                        <button type="button" onClick={() => setExpandedBudgetId(null)}>Done editing</button>
                        <button type="button" className="danger" onClick={() => removeBudgetItem(item.id)}>Remove</button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            }) : (
              <div className="empty-state action-empty">
                <strong>No budget items in this view.</strong>
                <span>Switch to All or add a new category.</span>
                <button type="button" onClick={() => setIsBudgetAddOpen(true)}>Add category</button>
              </div>
            )}
          </div>
        </section>

        <aside className={`budget-side-panel ${isBudgetAddOpen ? 'add-open' : ''}`}>
          {isBudgetAddOpen ? (
          <form
            className="budget-add-card budget-add-modern"
            onSubmit={(event) => {
              const shouldClose = budgetDraft.category.trim().length > 0;
              addBudgetItem(event);
              if (shouldClose) setIsBudgetAddOpen(false);
            }}
          >
            <div>
              <p className="eyebrow">New category</p>
              <h4>Add budget item</h4>
            </div>
        <label>
          <span>Category</span>
          <input value={budgetDraft.category} onChange={(event) => setBudgetDraft((current) => ({ ...current, category: event.target.value }))} placeholder="e.g. Door gift" aria-label="Budget category" />
        </label>
        <label>
          <span>Planned</span>
          <input type="number" value={budgetDraft.planned} onChange={(event) => setBudgetDraft((current) => ({ ...current, planned: Number(event.target.value) }))} placeholder="RM" aria-label="Planned budget" />
        </label>
        <label>
          <span>Actual</span>
          <input type="number" value={budgetDraft.actual} onChange={(event) => setBudgetDraft((current) => ({ ...current, actual: Number(event.target.value) }))} placeholder="RM" aria-label="Actual cost" />
        </label>
        <label>
          <span>Paid</span>
          <input type="number" value={budgetDraft.paid} onChange={(event) => setBudgetDraft((current) => ({ ...current, paid: Number(event.target.value) }))} placeholder="RM" aria-label="Paid amount" />
        </label>
        <div className="budget-edit-actions">
          <button type="submit" disabled={!budgetDraft.category.trim()}>Add item</button>
          <button type="button" className="danger" onClick={() => setIsBudgetAddOpen(false)}>Cancel</button>
        </div>
          </form>
          ) : null}

          <div className="budget-insight-card">
            <span>Quick insight</span>
            <strong>{largestActualItem && largestActualItem.actual > 0 ? largestActualItem.category : 'No spending yet'}</strong>
            <p>
              {largestActualItem && largestActualItem.actual > 0
                ? `${money(largestActualItem.actual)} is currently the largest actual cost.`
                : 'Add actual costs to see which categories need attention.'}
            </p>
          </div>

          <div className="budget-allocation-card">
            <span>Suggested split</span>
            <strong>{money(suggestionBase)} planning guide</strong>
            <p>Use this as a starting point, then adjust based on venue style and guest count.</p>
            <div className="budget-allocation-list">
              {budgetAllocation.map((allocation) => (
                <div key={allocation.label}>
                  <span>
                    <strong>{allocation.label}</strong>
                    <small>{allocation.hint}</small>
                  </span>
                  <em>{money(Math.round(suggestionBase * allocation.percent))}</em>
                </div>
              ))}
            </div>
            <button type="button" onClick={applyBudgetAllocation}>Apply suggested split</button>
          </div>

          <div className="budget-suggestion-card">
            <span>Budget suggestions</span>
            <strong>Common costs couples forget</strong>
            <p>Add these when they apply to your majlis. You can edit the estimate later.</p>
            {missingSuggestions.length > 0 ? (
              <div className="budget-suggestion-list">
                {missingSuggestions.map((item) => (
                  <button key={item.id} type="button" onClick={() => addSuggestedBudgetItem(item)}>
                    <span>
                      <strong>{item.category}</strong>
                      <small>{item.note}</small>
                    </span>
                    <em>{money(item.planned)}</em>
                  </button>
                ))}
              </div>
            ) : (
              <small>Nice, you already covered the common suggestion list.</small>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

type RsvpPanelProps = {
  guests: Guest[];
  guestDraft: Guest;
  setGuestDraft: Dispatch<SetStateAction<Guest>>;
  addGuest: (event: FormEvent) => void;
  updateGuest: (id: string, patch: Partial<Guest>) => void;
  removeGuest: (id: string) => void;
  exportGuestsCsv: () => void;
  importGuestsCsv: (file: File | undefined) => void;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
};

export function RsvpPanel({
  guests,
  guestDraft,
  setGuestDraft,
  addGuest,
  updateGuest,
  removeGuest,
  exportGuestsCsv,
  importGuestsCsv,
  confirmedGuests,
  pendingGuests,
  declinedGuests
}: RsvpPanelProps) {
  const [guestView, setGuestView] = useState<'all' | 'pending' | 'confirmed' | 'declined'>('all');
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
  const [isGuestAddOpen, setIsGuestAddOpen] = useState(false);
  const guestImportRef = useRef<HTMLInputElement | null>(null);
  const totalPax = guests.reduce((sum, guest) => sum + guest.pax, 0);
  const guestGroups = Array.from(new Set(guests.map((guest) => guest.group).filter(Boolean)));
  const filteredGuests = guests.filter((guest) => guestView === 'all' || guest.status === guestView);
  const guestViewOptions = [
    { value: 'all' as const, label: 'All', count: guests.length },
    { value: 'pending' as const, label: 'Pending', count: guests.filter((guest) => guest.status === 'pending').length },
    { value: 'confirmed' as const, label: 'Confirmed', count: guests.filter((guest) => guest.status === 'confirmed').length },
    { value: 'declined' as const, label: 'Declined', count: guests.filter((guest) => guest.status === 'declined').length }
  ];
  const topGroup = guestGroups
    .map((group) => ({
      group,
      pax: guests.filter((guest) => guest.group === group).reduce((sum, guest) => sum + guest.pax, 0)
    }))
    .sort((first, second) => second.pax - first.pax)[0];

  return (
    <div className="planner-panel guest-command-center">
      <div className="planner-panel-header guest-hero-modern">
        <div>
          <p className="eyebrow">RSVP manager</p>
          <h3>Guest list and headcount</h3>
          <p>Track attendance by household, group, and pax without turning the page into a spreadsheet.</p>
        </div>
        <div className="guest-header-actions">
          <button type="button" className="primary-action" onClick={() => setIsGuestAddOpen(true)}>Add guest</button>
          <button type="button" className="utility-action" onClick={() => guestImportRef.current?.click()}>Import CSV</button>
          <button type="button" className="utility-action" onClick={exportGuestsCsv} disabled={guests.length === 0}>Export CSV</button>
          <input
            ref={guestImportRef}
            className="visually-hidden"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              importGuestsCsv(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </div>
      </div>

      <div className="guest-focus-grid" aria-label="Guest headcount summary">
        <article className="guest-focus-card">
          <span>Total pax</span>
          <strong>{totalPax}</strong>
          <p>{guests.length} guest record{guests.length === 1 ? '' : 's'}</p>
        </article>
        <article><span>Confirmed</span><strong>{confirmedGuests}</strong><p>ready for caterer</p></article>
        <article><span>Pending</span><strong>{pendingGuests}</strong><p>need follow-up</p></article>
        <article><span>Declined</span><strong>{declinedGuests}</strong><p>not attending</p></article>
      </div>

      <div className="guest-workspace">
        <section className="guest-main">
          <div className="guest-toolbar">
            <div className="guest-view-tabs" role="tablist" aria-label="Guest views">
              {guestViewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={guestView === option.value}
                  className={guestView === option.value ? 'active' : ''}
                  onClick={() => setGuestView(option.value)}
                >
                  {option.label}
                  <span>{option.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="guest-list-modern">
            {filteredGuests.length > 0 ? filteredGuests.map((guest) => {
              const isExpanded = expandedGuestId === guest.id;

              return (
                <article key={guest.id} className={`guest-row-card ${isExpanded ? 'expanded' : ''}`}>
                  <button
                    type="button"
                    className="guest-row-summary"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedGuestId(isExpanded ? null : guest.id)}
                  >
                    <span className="guest-avatar" aria-hidden="true">{guest.name.slice(0, 1).toUpperCase()}</span>
                    <span className="guest-row-title">
                      <strong>{guest.name}</strong>
                      <small>{guest.phone || 'No phone'} - {guest.group}</small>
                    </span>
                    <span className="guest-pax">{guest.pax} pax</span>
                    <span className={`guest-status ${guest.status}`}>{rsvpLabel(guest.status)}</span>
                  </button>

                  {isExpanded ? (
                    <div className="guest-edit-panel">
                      <label>
                        <span>Name</span>
                        <input value={guest.name} onChange={(event) => updateGuest(guest.id, { name: event.target.value })} aria-label="Guest name" />
                      </label>
                      <label>
                        <span>Phone</span>
                        <input value={guest.phone} onChange={(event) => updateGuest(guest.id, { phone: event.target.value })} aria-label="Guest phone" />
                      </label>
                      <label>
                        <span>Group</span>
                        <input value={guest.group} onChange={(event) => updateGuest(guest.id, { group: event.target.value })} aria-label="Guest group" />
                      </label>
                      <label>
                        <span>Pax</span>
                        <input type="number" min="1" value={guest.pax} onChange={(event) => updateGuest(guest.id, { pax: Number(event.target.value) || 1 })} aria-label="Guest pax" />
                      </label>
                      <label>
                        <span>Status</span>
                        <select value={guest.status} onChange={(event) => updateGuest(guest.id, { status: event.target.value as Guest['status'] })} aria-label={`RSVP status for ${guest.name}`}>
                          <option value="pending">Belum Reply</option>
                          <option value="confirmed">Confirm Hadir</option>
                          <option value="declined">Tidak Hadir</option>
                        </select>
                      </label>
                      <div className="guest-edit-actions">
                        <button type="button" onClick={() => setExpandedGuestId(null)}>Done editing</button>
                        <button type="button" className="danger" onClick={() => removeGuest(guest.id)}>Remove</button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            }) : (
              <div className="empty-state action-empty">
                <strong>No guests in this view.</strong>
                <span>Switch tabs or add a guest from the side panel.</span>
                <button type="button" onClick={() => setIsGuestAddOpen(true)}>Add guest</button>
              </div>
            )}
          </div>
        </section>

        <aside className={`guest-side-panel ${isGuestAddOpen ? 'add-open' : ''}`}>
          {isGuestAddOpen ? (
          <form
            className="guest-add-card"
            onSubmit={(event) => {
              const shouldClose = guestDraft.name.trim().length > 0;
              addGuest(event);
              if (shouldClose) setIsGuestAddOpen(false);
            }}
          >
            <div>
              <p className="eyebrow">New guest</p>
              <h4>Add guest</h4>
            </div>
            <input value={guestDraft.name} onChange={(event) => setGuestDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Guest name" aria-label="Guest name" />
            <input value={guestDraft.phone} onChange={(event) => setGuestDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" aria-label="Guest phone" />
            <select value={guestDraft.group} onChange={(event) => setGuestDraft((current) => ({ ...current, group: event.target.value }))} aria-label="Guest group">
              <option>Tetamu Ayah</option>
              <option>Tetamu Ibu</option>
              <option>Adik Beradik</option>
              <option>Kawan-kawan</option>
              <option>Rakan Sekerja</option>
              <option>VIP</option>
            </select>
            <input type="number" min="1" value={guestDraft.pax} onChange={(event) => setGuestDraft((current) => ({ ...current, pax: Number(event.target.value) || 1 }))} aria-label="Guest pax" />
            <select value={guestDraft.status} onChange={(event) => setGuestDraft((current) => ({ ...current, status: event.target.value as Guest['status'] }))} aria-label="RSVP status">
              <option value="pending">Belum Reply</option>
              <option value="confirmed">Confirm Hadir</option>
              <option value="declined">Tidak Hadir</option>
            </select>
            <div className="guest-edit-actions">
              <button type="submit" disabled={!guestDraft.name.trim()}>Add guest</button>
              <button type="button" className="danger" onClick={() => setIsGuestAddOpen(false)}>Cancel</button>
            </div>
          </form>
          ) : null}

          <div className="guest-insight-card">
            <span>Headcount insight</span>
            <strong>{topGroup ? topGroup.group : 'No groups yet'}</strong>
            <p>{topGroup ? `${topGroup.pax} pax in this group.` : 'Add guests to see the largest guest group.'}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

type VendorsPanelProps = {
  filteredVendors: Vendor[];
  vendorStates: string[];
  vendorCategories: string[];
  vendorFilter: { negeri: string; category: string };
  setVendorFilter: Dispatch<SetStateAction<{ negeri: string; category: string }>>;
  savedVendors: string[];
  toggleSavedVendor: (id: string) => void;
  askVendorMessage: (vendor: Vendor) => void;
  askVendorQuestions: (vendor: Vendor) => void;
  addVendorToBudget: (vendor: Vendor) => void;
};

export function VendorsPanel({
  filteredVendors,
  vendorStates,
  vendorCategories,
  vendorFilter,
  setVendorFilter,
  savedVendors,
  toggleSavedVendor,
  askVendorMessage,
  askVendorQuestions,
  addVendorToBudget
}: VendorsPanelProps) {
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [compareVendorIds, setCompareVendorIds] = useState<string[]>([]);
  const mapQueryBase = (vendor: Vendor) => encodeURIComponent(`${vendor.name} ${vendor.category} ${vendor.negeri} Malaysia`);
  const selectedMapVendor = filteredVendors.find((vendor) => savedVendors.includes(vendor.id)) || filteredVendors[0];
  const comparedVendors = compareVendorIds
    .map((id) => filteredVendors.find((vendor) => vendor.id === id))
    .filter((vendor): vendor is Vendor => Boolean(vendor));
  const toggleCompareVendor = (id: string) => {
    setCompareVendorIds((current) => {
      if (current.includes(id)) return current.filter((vendorId) => vendorId !== id);
      return [...current, id].slice(-3);
    });
  };

  return (
    <div className="planner-panel vendor-discovery-panel">
      <div className="planner-panel-header vendor-page-header">
        <div>
          <p className="eyebrow">Vendor directory</p>
          <h3>Curated Malaysia vendor shortlist</h3>
          <p>Explore vendors by location, compare price ranges, and draft outreach messages faster.</p>
        </div>
        <div className="vendor-header-actions">
          <span className="status-pill">{savedVendors.length} shortlisted</span>
          {compareVendorIds.length > 0 ? <span className="status-pill">{compareVendorIds.length}/3 comparing</span> : null}
        </div>
      </div>

      <div className="vendor-filter-bar">
        <label>
          <span>Negeri</span>
          <select value={vendorFilter.negeri} onChange={(event) => setVendorFilter((current) => ({ ...current, negeri: event.target.value }))} aria-label="Filter vendor negeri">
            <option value="All">All negeri</option>
            {vendorStates.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
        <label>
          <span>Category</span>
          <select value={vendorFilter.category} onChange={(event) => setVendorFilter((current) => ({ ...current, category: event.target.value }))} aria-label="Filter vendor category">
            <option value="All">All categories</option>
            {vendorCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <span className="vendor-result-count">{filteredVendors.length} result{filteredVendors.length === 1 ? '' : 's'}</span>
      </div>

      {selectedMapVendor ? (
        <section className="vendor-map-panel" aria-label="Google Maps vendor preview">
          <div className="vendor-map-info">
            <p className="eyebrow">Map preview</p>
            <h4>{selectedMapVendor.name}</h4>
            <span>{selectedMapVendor.category} in {selectedMapVendor.negeri}</span>
            <p>{money(selectedMapVendor.minPrice)} - {money(selectedMapVendor.maxPrice)}</p>
            <div className="vendor-map-actions">
              <a href={`https://www.google.com/maps/search/?api=1&query=${mapQueryBase(selectedMapVendor)}`} target="_blank" rel="noreferrer">
                View map
              </a>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapQueryBase(selectedMapVendor)}`} target="_blank" rel="noreferrer">
                Directions
              </a>
            </div>
          </div>
          <iframe
            title={`Google Maps preview for ${selectedMapVendor.name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${mapQueryBase(selectedMapVendor)}&output=embed`}
          />
        </section>
      ) : null}

      {comparedVendors.length > 0 ? (
        <section className="vendor-compare-panel" aria-label="Vendor comparison">
          <div className="vendor-compare-header">
            <div>
              <p className="eyebrow">Compare</p>
              <h4>Shortlist side by side</h4>
            </div>
            <button type="button" onClick={() => setCompareVendorIds([])}>Clear</button>
          </div>
          <div className="vendor-compare-grid">
            {comparedVendors.map((vendor) => (
              <article key={vendor.id}>
                <strong>{vendor.name}</strong>
                <span>{vendor.category} - {vendor.negeri}</span>
                <dl>
                  <div>
                    <dt>Price</dt>
                    <dd>{money(vendor.minPrice)} - {money(vendor.maxPrice)}</dd>
                  </div>
                  <div>
                    <dt>Rating</dt>
                    <dd>{vendor.rating.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>{vendor.contact}</dd>
                  </div>
                </dl>
                <button type="button" onClick={() => setSelectedVendor(vendor)}>Open details</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="vendor-grid">
        {filteredVendors.map((vendor) => (
          <article key={vendor.id} className="vendor-card">
            <div className="vendor-top">
              <div>
                <strong>{vendor.name}</strong>
                <span>{vendor.category} - {vendor.negeri}</span>
              </div>
              <span className="vendor-rating">{vendor.rating.toFixed(1)}</span>
            </div>
            <p>{vendor.note}</p>
            <div className="vendor-meta-row">
              <span>{money(vendor.minPrice)} - {money(vendor.maxPrice)}</span>
              <span>{vendor.contact}</span>
              {vendor.instagram ? <span>{vendor.instagram}</span> : null}
            </div>
            <div className="vendor-actions">
              <button type="button" className={savedVendors.includes(vendor.id) ? 'is-saved' : ''} onClick={() => toggleSavedVendor(vendor.id)}>
                {savedVendors.includes(vendor.id) ? 'Shortlisted' : 'Shortlist'}
              </button>
              <button type="button" className={compareVendorIds.includes(vendor.id) ? 'is-saved' : ''} onClick={() => toggleCompareVendor(vendor.id)}>
                {compareVendorIds.includes(vendor.id) ? 'Comparing' : 'Compare'}
              </button>
              <button type="button" className="primary" onClick={() => askVendorMessage(vendor)}>Draft WhatsApp</button>
              <button type="button" onClick={() => setSelectedVendor(vendor)}>Details</button>
              <button type="button" onClick={() => askVendorQuestions(vendor)}>Questions</button>
              <button type="button" onClick={() => addVendorToBudget(vendor)}>Add to budget</button>
              <a href={`https://www.google.com/maps/search/?api=1&query=${mapQueryBase(vendor)}`} target="_blank" rel="noreferrer">
                View map
              </a>
            </div>
          </article>
        ))}
      </div>

      {selectedVendor ? (
        <>
          <button
            type="button"
            className="vendor-detail-backdrop"
            aria-label="Close vendor details"
            onClick={() => setSelectedVendor(null)}
          />
          <aside className="vendor-detail-drawer" aria-label={`${selectedVendor.name} vendor details`}>
            <div className="vendor-detail-header">
              <div>
                <p className="eyebrow">{selectedVendor.category}</p>
                <h3>{selectedVendor.name}</h3>
                <span>{selectedVendor.negeri} - {selectedVendor.rating.toFixed(1)} rating</span>
              </div>
              <button type="button" onClick={() => setSelectedVendor(null)}>Close</button>
            </div>
            <iframe
              title={`Google Maps detail for ${selectedVendor.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${mapQueryBase(selectedVendor)}&output=embed`}
            />
            <div className="vendor-detail-body">
              <article>
                <span>Price range</span>
                <strong>{money(selectedVendor.minPrice)} - {money(selectedVendor.maxPrice)}</strong>
              </article>
              <article>
                <span>Contact</span>
                <strong>{selectedVendor.contact}</strong>
                {selectedVendor.instagram ? <p>{selectedVendor.instagram}</p> : null}
              </article>
              <article>
                <span>Notes</span>
                <p>{selectedVendor.note}</p>
              </article>
            </div>
            <div className="vendor-detail-actions">
              <button type="button" className="primary" onClick={() => askVendorMessage(selectedVendor)}>Draft WhatsApp</button>
              <button type="button" onClick={() => askVendorQuestions(selectedVendor)}>Questions</button>
              <button type="button" onClick={() => addVendorToBudget(selectedVendor)}>Add to budget</button>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapQueryBase(selectedVendor)}`} target="_blank" rel="noreferrer">
                Directions
              </a>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
