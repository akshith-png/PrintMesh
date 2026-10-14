"use client";

import { useState } from "react";

export function PrinterSetupPanel({ printers }: { printers: Array<{ id: string; name: string; is_available?: boolean | null }> }) {
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const command = 'PrintMesh.Agent.exe --discover-printers';
  async function copy() {
    await navigator.clipboard?.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  async function selectPrinter(id: string) {
    setError(null);
    const response = await fetch(`/api/merchant/printers/${id}/select`, { method: "POST" });
    const result = await response.json() as { selected?: boolean; printerName?: string; error?: string };
    if (!response.ok) { setError(result.error ?? "Could not select printer."); return; }
    setSelected(result.printerName ?? id);
  }
  return <div className="resource-list">
    <p className="muted">The agent discovers printers already installed in Windows. Select the exact printer name on the merchant PC; PrintMesh never installs a printer driver.</p>
    {printers.length > 0 && <div className="resource-list">{printers.map((printer) => <div className="resource-row" key={printer.id}><div><strong>{printer.name}</strong><span className={printer.is_available ? "online-dot" : "offline-dot"}>{printer.is_available ? "Available" : "Unavailable"}</span></div><button type="button" disabled={!printer.is_available} onClick={() => selectPrinter(printer.id)}>{selected === printer.name ? "Selected" : "Select"}</button></div>)}</div>}
    {error && <p className="message" role="alert">{error}</p>}
    <button className="secondary-button" type="button" onClick={copy}>{copied ? "Copied" : "Copy discovery command"}</button>
  </div>;
}
