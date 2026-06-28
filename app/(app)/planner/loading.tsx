export default function PlannerLoading() {
  return (
    <div className="chat-loading" role="status" aria-live="polite">
      <div className="chat-loading__messages" aria-hidden="true">
        <div className="skeleton-message skeleton-message--assistant" />
        <div className="skeleton-message skeleton-message--user" />
        <div className="skeleton-message skeleton-message--assistant" />
      </div>
      <div className="chat-loading__input" aria-hidden="true">
        <div className="skeleton-bar" style={{ width: '100%', height: '44px' }} />
      </div>
      <span className="visually-hidden">Sedang menyediakan planner…</span>
    </div>
  );
}
