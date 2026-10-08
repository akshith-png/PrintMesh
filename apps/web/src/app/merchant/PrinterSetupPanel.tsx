"use client";

import { useState } from "react";

export function PrinterSetupPanel({ printers }: { printers: Array<{ name: string; is_available?: boolean | null }> }) {
  const [copied, setCopied] = useState(false);
  const command = 'PrintMesh.Agent.exe --discover-printers';
  async function copy() {
    await navigator.clipboard?.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <div className="resource-list">
    <p className="muted">The agent discovers printers already installed in Windows. Select the exact printer name on the merchant PC; PrintMesh never installs a printer driver.</p>
    {printers.length > 0 && <div className="resource-list">{printers.map((printer) => <div className="resource-row" key={printer.name}><strong>{printer.name}</strong><span className={printer.is_available ? "online-dot" : "offline-dot"}>{printer.is_available ? "Available" : "Unavailable"}</span></div>)}</div>}
    <button className="secondary-button" type="button" onClick={copy}>{copied ? "Copied" : "Copy discovery command"}</button>
  </div>;
}
