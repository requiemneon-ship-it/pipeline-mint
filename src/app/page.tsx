import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <header className="landingHeader">
        <div className="brand">Pipeline<span>Mint</span></div>
        <Link className="secondaryButton" href="/dashboard">Open demo</Link>
      </header>
      <section className="hero">
        <div className="eyebrow">AI LEAD OPERATIONS</div>
        <h1>Turn scattered leads into a predictable sales pipeline.</h1>
        <p>Capture, qualify, route and follow up on leads from one workspace — with AI summaries and next-action suggestions built in.</p>
        <div className="heroActions">
          <Link className="primaryButton" href="/dashboard">Explore live demo</Link>
          <a className="textLink" href="#features">See product scope →</a>
        </div>
        <div className="proofRow">
          <span>Multi-tenant</span><span>RBAC-ready</span><span>Webhook-first</span><span>RU/EN-ready</span>
        </div>
      </section>
      <section id="features" className="featureGrid">
        <article><b>01</b><h2>Capture</h2><p>Website forms, Telegram, referrals and API/webhooks land in one queue.</p></article>
        <article><b>02</b><h2>Qualify</h2><p>Lead scoring, AI summaries and suggested responses reduce manual triage.</p></article>
        <article><b>03</b><h2>Convert</h2><p>Kanban stages, follow-up tasks and activity history make ownership obvious.</p></article>
      </section>
    </main>
  );
}
