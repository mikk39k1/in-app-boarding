"use client";

import { useState } from "react";

type Tab = "overview" | "settings" | "integrations";

export default function Page() {
  const [tab, setTab] = useState<Tab>("overview");
  const [name, setName] = useState("Acme Inc.");

  return (
    <main>
      <header className="hero">
        <div>
          <h1 id="page-title">Welcome to Acme</h1>
          <p className="muted">A fake app for testing the onboarding SDK.</p>
        </div>
        <button
          className="primary"
          data-onboarding="invite-team"
          aria-label="Invite team"
        >
          Invite team
        </button>
      </header>

      <nav className="tabs" role="tablist">
        <button
          role="tab"
          id="tab-overview"
          aria-controls="panel-overview"
          aria-selected={tab === "overview"}
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
          data-onboarding="tab-overview"
        >
          Overview
        </button>
        <button
          role="tab"
          id="tab-settings"
          aria-controls="panel-settings"
          aria-selected={tab === "settings"}
          className={tab === "settings" ? "active" : ""}
          onClick={() => setTab("settings")}
          data-onboarding="tab-settings"
        >
          Settings
        </button>
        <button
          role="tab"
          id="tab-integrations"
          aria-controls="panel-integrations"
          aria-selected={tab === "integrations"}
          className={tab === "integrations" ? "active" : ""}
          onClick={() => setTab("integrations")}
          aria-label="Integrations"
        >
          Integrations
        </button>
      </nav>

      <section
        role="tabpanel"
        id="panel-overview"
        aria-labelledby="tab-overview"
        hidden={tab !== "overview"}
      >
          <div className="grid">
            <div className="card" id="metric-revenue">
              <h3>Revenue</h3>
              <p>$12,540 this month</p>
              <button className="secondary">View report</button>
            </div>
            <div
              className="card"
              data-onboarding="users-card"
              aria-label="Users card"
            >
              <h3>Users</h3>
              <p>320 active</p>
              <button className="secondary">Manage</button>
            </div>
            <div className="card">
              <h3>Health</h3>
              <p>All systems green</p>
              <button className="secondary">Status page</button>
            </div>
          </div>
      </section>

      <section
        role="tabpanel"
        id="panel-settings"
        aria-labelledby="tab-settings"
        hidden={tab !== "settings"}
      >
          <div className="card" style={{ maxWidth: 480 }}>
            <h3>Workspace</h3>
            <label className="field">
              Name
              <input
                className="field"
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="row">
              <button
                className="primary"
                data-onboarding="save-settings"
                aria-label="Save settings"
              >
                Save changes
              </button>
              <button className="secondary">Cancel</button>
            </div>
          </div>
      </section>

      <section
        role="tabpanel"
        id="panel-integrations"
        aria-labelledby="tab-integrations"
        hidden={tab !== "integrations"}
      >
          <div className="grid">
            <div className="card">
              <h3>Slack</h3>
              <p>Send notifications to a channel.</p>
              <button className="primary">Connect</button>
            </div>
            <div className="card">
              <h3>GitHub</h3>
              <p>Sync issues and PRs.</p>
              <button className="primary">Connect</button>
            </div>
          </div>
      </section>
    </main>
  );
}
