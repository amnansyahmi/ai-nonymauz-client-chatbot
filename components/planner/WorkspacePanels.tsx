import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ActivityItem, BudgetItem, Guest, PlannerProfile, Vendor } from './types';
import { money, rsvpLabel } from './utils';

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
  return (
    <div className="dashboard-panel">
      <form className="onboarding-panel" onSubmit={completeOnboarding}>
        <div>
          <p className="eyebrow">5-step setup</p>
          <h3>{plannerProfile.completed ? 'Majlis profile' : 'Start your planner'}</h3>
          <p>Set the key details once, then MajlisMate.ai can calculate deadlines and personalize suggestions.</p>
        </div>
        <input
          value={plannerProfile.coupleName}
          onChange={(event) => setPlannerProfile((current) => ({ ...current, coupleName: event.target.value }))}
          placeholder="Couple / majlis name"
          aria-label="Couple or majlis name"
        />
        <input
          type="date"
          value={plannerProfile.majlisDate}
          onChange={(event) => setPlannerProfile((current) => ({ ...current, majlisDate: event.target.value }))}
          aria-label="Majlis date"
        />
        <input
          value={plannerProfile.negeri}
          onChange={(event) => setPlannerProfile((current) => ({ ...current, negeri: event.target.value }))}
          placeholder="Negeri"
          aria-label="Majlis negeri"
        />
        <input
          type="number"
          value={plannerProfile.totalBudget}
          onChange={(event) => setPlannerProfile((current) => ({ ...current, totalBudget: Number(event.target.value) }))}
          placeholder="Total budget"
          aria-label="Total budget"
        />
        <input
          type="number"
          value={plannerProfile.guestTarget}
          onChange={(event) => setPlannerProfile((current) => ({ ...current, guestTarget: Number(event.target.value) }))}
          placeholder="Guest target"
          aria-label="Guest target"
        />
        <button type="submit">Save setup</button>
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
  return (
    <div className="planner-panel">
      <div className="planner-panel-header">
        <div>
          <p className="eyebrow">Budget tracker</p>
          <h3>Planned vs actual vs paid</h3>
        </div>
        <button type="button" onClick={exportBudgetCsv} disabled={budgetItems.length === 0}>Export CSV</button>
      </div>

      <div className="dashboard-grid compact">
        <article className="metric-card"><span>Planned</span><strong>{money(totalPlanned)}</strong></article>
        <article className="metric-card"><span>Actual</span><strong>{money(totalActual)}</strong></article>
        <article className="metric-card"><span>Paid</span><strong>{money(totalPaid)}</strong></article>
      </div>

      <form className="planner-form" onSubmit={addBudgetItem}>
        <input value={budgetDraft.category} onChange={(event) => setBudgetDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Category" aria-label="Budget category" />
        <input type="number" value={budgetDraft.planned} onChange={(event) => setBudgetDraft((current) => ({ ...current, planned: Number(event.target.value) }))} placeholder="Planned RM" aria-label="Planned budget" />
        <input type="number" value={budgetDraft.actual} onChange={(event) => setBudgetDraft((current) => ({ ...current, actual: Number(event.target.value) }))} placeholder="Actual RM" aria-label="Actual cost" />
        <input type="number" value={budgetDraft.paid} onChange={(event) => setBudgetDraft((current) => ({ ...current, paid: Number(event.target.value) }))} placeholder="Paid RM" aria-label="Paid amount" />
        <button type="submit" disabled={!budgetDraft.category.trim()}>Add</button>
      </form>

      <div className="data-list">
        {budgetItems.map((item) => (
          <article key={item.id} className={`data-row ${item.actual > item.planned && item.planned > 0 ? 'warning' : ''}`}>
            <input value={item.category} onChange={(event) => updateBudgetItem(item.id, { category: event.target.value })} aria-label="Budget category" />
            <input type="number" value={item.planned} onChange={(event) => updateBudgetItem(item.id, { planned: Number(event.target.value) })} aria-label="Planned budget" />
            <input type="number" value={item.actual} onChange={(event) => updateBudgetItem(item.id, { actual: Number(event.target.value) })} aria-label="Actual cost" />
            <input type="number" value={item.paid} onChange={(event) => updateBudgetItem(item.id, { paid: Number(event.target.value) })} aria-label="Paid amount" />
            <select value={item.status} onChange={(event) => updateBudgetItem(item.id, { status: event.target.value as BudgetItem['status'] })} aria-label="Budget status">
              <option value="not-started">Belum Mula</option>
              <option value="in-progress">Sedang Diurus</option>
              <option value="done">Selesai</option>
            </select>
            <input value={item.note} onChange={(event) => updateBudgetItem(item.id, { note: event.target.value })} placeholder="Note" aria-label="Budget note" />
            <button type="button" onClick={() => removeBudgetItem(item.id)}>Remove</button>
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
