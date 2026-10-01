import Link from "next/link";
import { SEED_LEADS, STAGES, computeStats, formatMoney, salesBrief } from "../../lib/leads";

export const metadata = { title: "Dashboard — PipelineMint" };

const STAGE_LABEL = { new: "New", qualified: "Qualified", proposal: "Proposal", won: "Won" } as const;

export default function Dashboard() {
  const leads = SEED_LEADS;
  const stats = computeStats(leads);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">Pipeline<span>Mint</span></div>
        <nav>
          <Link className="navItem active" href="/dashboard">Pipeline</Link>
          <a className="navItem" href="/api/leads">API: /api/leads</a>
          <Link className="navItem" href="/">Landing</Link>
        </nav>
        <div className="workspaceCard">
          <div className="workspaceAvatar">PM</div>
          <div><strong>Demo workspace</strong><small>Seed data</small></div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">SALES OVERVIEW</p>
            <h1>Pipeline</h1>
          </div>
          <div className="topActions">
            <a className="secondaryButton" href="/api/leads">View API</a>
          </div>
        </header>

        <section className="statsGrid" aria-label="Key metrics">
          <div className="stat"><span>Open pipeline</span><strong>{formatMoney(stats.openValue)}</strong><small>{stats.totalLeads - stats.byStage.won} open leads</small></div>
          <div className="stat"><span>Won revenue</span><strong>{formatMoney(stats.wonValue)}</strong><small>{stats.byStage.won} won</small></div>
          <div className="stat"><span>Average score</span><strong>{stats.avgScore}</strong><small>0–100 scale</small></div>
          <div className="stat"><span>Win rate</span><strong>{stats.winRate}%</strong><small>of all leads</small></div>
        </section>

        <section className="aiPanel">
          <div>
            <p className="eyebrow">SALES BRIEF</p>
            <h2>Today&apos;s focus</h2>
            <p>{salesBrief(leads)}</p>
          </div>
        </section>

        <div className="sectionHeading">
          <div><h2>Lead pipeline</h2><p>Leads grouped by stage</p></div>
        </div>

        <section className="kanban">
          {STAGES.map((stage) => (
            <div className="column" key={stage}>
              <div className="columnHeader"><span>{STAGE_LABEL[stage]}</span><b>{stats.byStage[stage]}</b></div>
              {leads.filter((l) => l.stage === stage).map((lead) => (
                <article className="leadCard" key={lead.id}>
                  <div className="leadTop">
                    <span className={lead.score >= 60 ? "score" : "score score-cold"}>{lead.score}</span>
                    <span className="source">{lead.source}</span>
                  </div>
                  <h3>{lead.name}</h3>
                  <p>{lead.company}</p>
                  <div className="leadValue">{formatMoney(lead.value)}</div>
                  <small>{lead.nextAction}</small>
                </article>
              ))}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
