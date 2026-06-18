export default function Loading() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading__orb" aria-hidden="true">
        <span>AI</span>
      </div>
      <p className="app-loading__text">Memuatkan MajlisMate.ai…</p>
      <div className="app-loading__skeleton" aria-hidden="true">
        <div className="skeleton-bar" style={{ width: '70%' }} />
        <div className="skeleton-bar" style={{ width: '45%' }} />
        <div className="skeleton-bar" style={{ width: '90%' }} />
        <div className="skeleton-bar" style={{ width: '60%' }} />
      </div>
    </div>
  );
}
