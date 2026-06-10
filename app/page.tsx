import PlannerWorkspace from '../components/PlannerWorkspace';

const features = [
  {
    title: 'Wedding planning chat',
    text: 'Ask about nikah, sanding, reception flow, vendors, guest planning, budget, and majlis preparation.'
  },
  {
    title: 'AI wedding checklists',
    text: 'Turn planning requests into trackable tasks for venue viewing, vendor meetings, fittings, and final prep.'
  },
  {
    title: 'Vendor appointments',
    text: 'Ask the same chatbot to schedule food tastings, venue visits, makeup trials, and family discussions.'
  }
];

const steps = [
  'Ask the assistant',
  'Let AI create the tool',
  'Track the result'
];

export default function Home() {
  return (
    <>
      <nav className="site-nav" aria-label="Main navigation">
        <div className="container nav-inner">
          <a href="#" className="logo" aria-label="MajlisMate.ai home">
            MajlisMate<span>.ai</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#assistant" className="btn btn-ghost">Open assistant</a>
            <a href="/chat" className="btn btn-primary">Fullscreen app</a>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="floral left">AI</div>
          <div className="floral right">24/7</div>
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="hero-eyebrow">Installable AI Wedding Planner PWA</span>
              <h1>
                Your majlis, <em>thoughtfully planned</em> with AI.
              </h1>
              <p className="hero-text">
                MajlisMate.ai helps couples plan wedding tasks, vendor meetings, budgets, timelines, and guest details in
                one calm chatbot workspace.
              </p>
              <div className="hero-cta">
                <a href="#assistant" className="btn btn-primary">Try the PWA demo</a>
                <a href="#features" className="btn btn-ghost">See what it does</a>
              </div>
            </div>

            <aside className="app-card" aria-label="PWA preview">
              <div className="phone-frame">
                <div className="phone-status">
                  <span>MajlisMate.ai</span>
                  <span>Live</span>
                </div>
                <div className="phone-screen">
                  <p className="mini-eyebrow">Wedding workspace</p>
                  <h2>Planning that turns ideas into action.</h2>
                  <div className="mini-list">
                    <span>Chat</span>
                    <span>Checklist</span>
                    <span>Calendar</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="features" id="features">
          <div className="container">
            <div className="section-title">
              <h2>
                Everything your majlis needs, <em>in one place</em>
              </h2>
              <p>Same chatbot, more useful outputs. MajlisMate.ai can plan, organize tasks, and prepare follow-ups.</p>
            </div>
            <div className="grid">
              {features.map((feature, index) => (
                <article className="card" key={feature.title}>
                  <div className="card-icon">{index + 1}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="steps" id="how">
          <div className="container">
            <div className="section-title">
              <h2>
                From wedding idea to <em>completed plan</em>
              </h2>
              <p>Designed like a lightweight wedding planning app, powered by the chat flow you already have.</p>
            </div>
            <div className="steps-grid">
              {steps.map((step, index) => (
                <article className="step" key={step}>
                  <div className="step-num">{index + 1}</div>
                  <h4>{step}</h4>
                  <p>
                    {index === 0
                      ? 'Couples ask in English or Malay using the familiar chat box.'
                      : index === 1
                        ? 'The app detects when the wedding request should become a checklist or appointment.'
                        : 'Review suggestions, tick tasks, and keep vendor appointments organized.'}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="assistant-stage" id="assistant">
          <div className="container">
            <div className="section-title">
              <span className="hero-eyebrow">Live PWA workspace</span>
              <h2>
                Ask MajlisMate.ai, then switch menus when AI creates something useful.
              </h2>
            </div>
            <PlannerWorkspace />
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <p>2026 MajlisMate.ai. Built as an AI wedding planner PWA.</p>
        </div>
      </footer>
    </>
  );
}
