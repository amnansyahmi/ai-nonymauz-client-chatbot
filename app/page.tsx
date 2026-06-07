import ChatWidget from '@/components/ChatWidget';

const features = [
  'RAG-lite knowledge retrieval from data/knowledge.json',
  'Server-side API proxy so API key stays safe',
  'Malay + English support prompt',
  'Source titles returned to the UI',
  'Demo fallback if AI-nonymauz env is not configured',
  'Ready for Vercel deployment'
];

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Template bisnes untuk client</p>
          <h1>AI chatbot untuk SOP, FAQ, dan website support client.</h1>
          <p className="hero-text">
            Ini contoh sistem yang boleh dijual sebagai Company Knowledge Bot atau Website Support Bot. Client boleh simpan polisi,
            SOP, FAQ, warranty, refund, dan escalation rules dalam knowledge base, kemudian chatbot jawab berdasarkan data tersebut.
          </p>
          <div className="hero-actions">
            <a href="#demo">Try demo</a>
            <a href="/api/health" className="secondary">Check API health</a>
          </div>
        </div>
        <div className="feature-card">
          <h2>What is included?</h2>
          <ul>
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="business-grid">
        <article>
          <h3>For company knowledge</h3>
          <p>Upload or edit SOP, HR policy, support process, product FAQ, and internal rules in one structured JSON file.</p>
        </article>
        <article>
          <h3>For website support</h3>
          <p>Let customers ask about warranty, return, pricing process, booking, or escalation without waiting for human support.</p>
        </article>
        <article>
          <h3>For your AI-nonymauz backend</h3>
          <p>Route all AI calls through your own backend using OpenAI-compatible /v1/chat/completions endpoint.</p>
        </article>
      </section>

      <div id="demo">
        <ChatWidget />
      </div>
    </main>
  );
}
