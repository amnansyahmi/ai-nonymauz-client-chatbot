import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ActivityItem, BudgetItem, Guest, PlannerProfile, Vendor } from './types';
import { money, rsvpLabel, statusLabel } from './utils';

const malaysiaStates = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Kuala Lumpur',
  'Labuan',
  'Putrajaya'
];

type DashboardPanelProps = {
  plannerProfile: PlannerProfile;
  setPlannerProfile: Dispatch<SetStateAction<PlannerProfile>>;
  completeOnboarding: (event: FormEvent) => void;
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
};

export function DashboardPanel({
  plannerProfile,
  setPlannerProfile,
  completeOnboarding,
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
  activity
}: DashboardPanelProps) {
  const setupSteps = [
    plannerProfile.groomName.trim(),
    plannerProfile.brideName.trim(),
    plannerProfile.majlisDate,
    plannerProfile.negeri,
    plannerProfile.totalBudget > 0 || plannerProfile.guestTarget > 0 ? 'planning-scale' : ''
  ];
  const setupProgress = setupSteps.filter(Boolean).length;

  return (
    <div className="dashboard-panel">
      <form className="wedding-profile-card" onSubmit={completeOnboarding}>
        <div className="profile-card-intro">
          <p className="eyebrow">Wedding profile</p>
          <h3>{plannerProfile.completed ? 'Majlis details' : 'Set up your planner'}</h3>
          <p>These details personalize deadlines, budget suggestions, RSVP targets, and appointment planning.</p>
          <div className="setup-progress" aria-label={`${setupProgress} of 5 setup steps completed`}>
            <span>{setupProgress}/5 complete</span>
            <div className="progress-track"><span style={{ width: `${(setupProgress / 5) * 100}%` }} /></div>
          </div>
        </div>

        <div className="profile-fields">
          <label>
            <span>Groom name</span>
            <input
              value={plannerProfile.groomName}
              onChange={(event) => setPlannerProfile((current) => ({ ...current, groomName: event.target.value }))}
              placeholder="e.g. Amir"
              aria-label="Groom name"
            />
          </label>
          <label>
            <span>Bride name</span>
            <input
              value={plannerProfile.brideName}
              onChange={(event) => setPlannerProfile((current) => ({ ...current, brideName: event.target.value }))}
              placeholder="e.g. Aisyah"
              aria-label="Bride name"
            />
          </label>
          <label>
            <span>Majlis date</span>
            <input
              type="date"
              value={plannerProfile.majlisDate}
              onChange={(event) => setPlannerProfile((current) => ({ ...current, majlisDate: event.target.value }))}
              aria-label="Majlis date"
            />
          </label>
          <label>
            <span>Location</span>
            <select
              value={plannerProfile.negeri}
              onChange={(event) => setPlannerProfile((current) => ({ ...current, negeri: event.target.value }))}
              aria-label="Majlis location"
            >
              {malaysiaStates.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Total budget</span>
            <input
              type="number"
              value={plannerProfile.totalBudget}
              onChange={(event) => setPlannerProfile((current) => ({ ...current, totalBudget: Number(event.target.value) }))}
              placeholder="RM"
              aria-label="Total budget"
            />
          </label>
          <label>
            <span>Guest target</span>
            <input
              type="number"
              value={plannerProfile.guestTarget}
              onChange={(event) => setPlannerProfile((current) => ({ ...current, guestTarget: Number(event.target.value) }))}
              placeholder="Pax"
              aria-label="Guest target"
            />
          </label>
        </div>

        <div className="profile-card-footer">
          <span>{plannerProfile.coupleName || 'Saved locally on this device'}</span>
          <button type="submit">{plannerProfile.completed ? 'Update profile' : 'Save profile'}</button>
        </div>
      </form>

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
  budgetDraft: BudgetItem;
  setBudgetDraft: Dispatch<SetStateAction<BudgetItem>>;
  addBudgetItem: (event: FormEvent) => void;
  updateBudgetItem: (id: string, patch: Partial<BudgetItem>) => void;
  removeBudgetItem: (id: string) => void;
  exportBudgetCsv: () => void;
  totalPlanned: number;
  totalActual: number;
  totalPaid: number;
};

export function BudgetPanel({
  budgetItems,
  budgetDraft,
  setBudgetDraft,
  addBudgetItem,
  updateBudgetItem,
  removeBudgetItem,
  exportBudgetCsv,
  totalPlanned,
  totalActual,
  totalPaid
}: BudgetPanelProps) {
  const remainingToPay = Math.max(totalActual - totalPaid, 0);
  const plannedBalance = totalPlanned - totalActual;
  const paidProgress = totalActual > 0 ? Math.min(100, Math.round((totalPaid / totalActual) * 100)) : 0;
  const overBudgetItems = budgetItems.filter((item) => item.actual > item.planned && item.planned > 0);
  const activeBudgetItems = budgetItems.filter((item) => item.status !== 'done').length;

  return (
    <div className="planner-panel budget-panel">
      <div className="planner-panel-header budget-hero">
        <div>
          <p className="eyebrow">Budget tracker</p>
          <h3>Wedding budget overview</h3>
          <p>Track estimates, real costs, payments, and notes by category.</p>
        </div>
        <button type="button" onClick={exportBudgetCsv} disabled={budgetItems.length === 0}>Export CSV</button>
      </div>

      <div className="budget-overview">
        <article className="budget-primary-card">
          <span>Total paid</span>
          <strong>{money(totalPaid)}</strong>
          <div className="progress-track"><span style={{ width: `${paidProgress}%` }} /></div>
          <p>{paidProgress}% of actual costs paid</p>
        </article>
        <article className="budget-stat-card">
          <span>Planned</span>
          <strong>{money(totalPlanned)}</strong>
          <p>{plannedBalance >= 0 ? `${money(plannedBalance)} still within plan` : `${money(Math.abs(plannedBalance))} over plan`}</p>
        </article>
        <article className="budget-stat-card">
          <span>Actual</span>
          <strong>{money(totalActual)}</strong>
          <p>{overBudgetItems.length} categor{overBudgetItems.length === 1 ? 'y' : 'ies'} over budget</p>
        </article>
        <article className="budget-stat-card">
          <span>To pay</span>
          <strong>{money(remainingToPay)}</strong>
          <p>{activeBudgetItems} active categor{activeBudgetItems === 1 ? 'y' : 'ies'}</p>
        </article>
      </div>

      <form className="budget-add-card" onSubmit={addBudgetItem}>
        <div>
          <p className="eyebrow">New category</p>
          <h4>Add a budget item</h4>
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
        <button type="submit" disabled={!budgetDraft.category.trim()}>Add item</button>
      </form>

      <div className="budget-list">
        {budgetItems.map((item) => (
          <article key={item.id} className={`budget-item-card ${item.actual > item.planned && item.planned > 0 ? 'warning' : ''}`}>
            <div className="budget-item-top">
              <input value={item.category} onChange={(event) => updateBudgetItem(item.id, { category: event.target.value })} aria-label="Budget category" />
              <span className={`budget-status ${item.status}`}>{statusLabel(item.status)}</span>
            </div>
            <div className="budget-fields">
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
            </div>
            <div className="budget-note-row">
              <input value={item.note} onChange={(event) => updateBudgetItem(item.id, { note: event.target.value })} placeholder="Add vendor, due date, or payment note..." aria-label="Budget note" />
              <button type="button" onClick={() => removeBudgetItem(item.id)}>Remove</button>
            </div>
            {item.actual > item.planned && item.planned > 0 ? <small>Over budget by {money(item.actual - item.planned)}</small> : null}
          </article>
        ))}
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
  confirmedGuests,
  pendingGuests,
  declinedGuests
}: RsvpPanelProps) {
  return (
    <div className="planner-panel">
      <div className="planner-panel-header">
        <div>
          <p className="eyebrow">RSVP manager</p>
          <h3>Guest list and headcount</h3>
        </div>
        <button type="button" onClick={exportGuestsCsv} disabled={guests.length === 0}>Export CSV</button>
      </div>

      <div className="dashboard-grid compact">
        <article className="metric-card"><span>Confirm</span><strong>{confirmedGuests}</strong></article>
        <article className="metric-card"><span>Pending</span><strong>{pendingGuests}</strong></article>
        <article className="metric-card"><span>Declined</span><strong>{declinedGuests}</strong></article>
      </div>

      <form className="planner-form" onSubmit={addGuest}>
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
        <input type="number" min="1" value={guestDraft.pax} onChange={(event) => setGuestDraft((current) => ({ ...current, pax: Number(event.target.value) }))} aria-label="Guest pax" />
        <select value={guestDraft.status} onChange={(event) => setGuestDraft((current) => ({ ...current, status: event.target.value as Guest['status'] }))} aria-label="RSVP status">
          <option value="pending">Belum Reply</option>
          <option value="confirmed">Confirm Hadir</option>
          <option value="declined">Tidak Hadir</option>
        </select>
        <button type="submit" disabled={!guestDraft.name.trim()}>Add</button>
      </form>

      <div className="data-list">
        {guests.length > 0 ? guests.map((guest) => (
          <article key={guest.id} className="guest-row">
            <div>
              <strong>{guest.name}</strong>
              <span>{guest.phone || 'No phone'} - {guest.group} - {guest.pax} pax</span>
            </div>
            <select value={guest.status} onChange={(event) => updateGuest(guest.id, { status: event.target.value as Guest['status'] })} aria-label={`RSVP status for ${guest.name}`}>
              <option value="pending">Belum Reply</option>
              <option value="confirmed">Confirm Hadir</option>
              <option value="declined">Tidak Hadir</option>
            </select>
            <button type="button" onClick={() => removeGuest(guest.id)}>Remove</button>
          </article>
        )) : <p className="empty-state">Add guests manually, then export CSV for caterer headcount.</p>}
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
};

export function VendorsPanel({
  filteredVendors,
  vendorStates,
  vendorCategories,
  vendorFilter,
  setVendorFilter,
  savedVendors,
  toggleSavedVendor,
  askVendorMessage
}: VendorsPanelProps) {
  return (
    <div className="planner-panel">
      <div className="planner-panel-header">
        <div>
          <p className="eyebrow">Vendor directory</p>
          <h3>Curated Malaysia vendor shortlist</h3>
        </div>
        <span className="status-pill">{savedVendors.length} saved</span>
      </div>

      <div className="filter-row">
        <select value={vendorFilter.negeri} onChange={(event) => setVendorFilter((current) => ({ ...current, negeri: event.target.value }))} aria-label="Filter vendor negeri">
          <option value="All">All negeri</option>
          {vendorStates.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
        <select value={vendorFilter.category} onChange={(event) => setVendorFilter((current) => ({ ...current, category: event.target.value }))} aria-label="Filter vendor category">
          <option value="All">All categories</option>
          {vendorCategories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>

      <div className="vendor-grid">
        {filteredVendors.map((vendor) => (
          <article key={vendor.id} className="vendor-card">
            <div className="vendor-top">
              <div>
                <strong>{vendor.name}</strong>
                <span>{vendor.category} - {vendor.negeri}</span>
              </div>
              <span>{vendor.rating.toFixed(1)}</span>
            </div>
            <p>{vendor.note}</p>
            <small>{money(vendor.minPrice)} - {money(vendor.maxPrice)} - {vendor.contact} {vendor.instagram ? `- ${vendor.instagram}` : ''}</small>
            <div className="agenda-actions">
              <button type="button" onClick={() => toggleSavedVendor(vendor.id)}>{savedVendors.includes(vendor.id) ? 'Saved' : 'Save'}</button>
              <button type="button" onClick={() => askVendorMessage(vendor)}>AI Message</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
