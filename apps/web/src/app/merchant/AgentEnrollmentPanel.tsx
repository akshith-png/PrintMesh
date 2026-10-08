"use client";

import { useState } from "react";

export function AgentEnrollmentPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function createEnrollmentToken() {
    setCreating(true);
    setError(null);
    setToken(null);
    try {
      const response = await fetch("/api/merchant/agent-enrollment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expiresInMinutes: 60 }),
      });
      const result = await response.json() as { enrollmentToken?: string; expiresAt?: string; error?: string };
      if (!response.ok || !result.enrollmentToken) throw new Error(result.error ?? "Could not create an enrollment token.");
      setToken(result.enrollmentToken);
      setExpiresAt(result.expiresAt ?? null);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Could not create an enrollment token.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="resource-list">
      <p className="muted">Create a one-time token before setting up the Windows agent. It is shown only here and expires in one hour.</p>
      <button className="secondary-button" type="button" onClick={createEnrollmentToken} disabled={creating}>
        {creating ? "Creating…" : "Create setup token"}
      </button>
      {token && (
        <div className="resource-row">
          <div>
            <strong>Setup token</strong>
            <code>{token}</code>
            <span>{expiresAt ? `Expires ${new Date(expiresAt).toLocaleString()}` : "Expires in one hour"}</span>
          </div>
        </div>
      )}
      {error && <p role="alert" className="muted">{error}</p>}
    </div>
  );
}
