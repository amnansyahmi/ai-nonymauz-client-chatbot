import PlannerWorkspace from '@/components/PlannerWorkspace';

export const metadata = {
  title: 'Planner | MajlisMate.ai'
};

/**
 * The cloud planner: same workspace as /chat, but every change (chat, checklist,
 * budget, calendar, guests, profile, vendors) is persisted to the database and
 * tied to the signed-in email.
 */
export default function PlannerPage() {
  return (
    <main className="embed-page">
      <PlannerWorkspace persist />
    </main>
  );
}
