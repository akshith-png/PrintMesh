"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) { setMessage("Choose a PDF first."); return; }
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    form.append("copies", "1");
    form.append("colorMode", "BW");
    form.append("duplex", "false");
    form.append("paperSize", "A4");
    try {
      const response = await fetch("/api/jobs", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed.");
      setMessage(`PDF accepted: ${data.originalFilename} (${data.sizeBytes} bytes)`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 40, fontFamily: "Arial, sans-serif" }}>
      <h1>PrintMesh</h1>
      <p>Local print-network V1 foundation.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 16, padding: 24, border: "1px solid #ddd", borderRadius: 12 }}>
        <label>PDF file<input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: "block", marginTop: 8 }} /></label>
        <button type="submit" disabled={busy} style={{ padding: "12px 18px", cursor: busy ? "wait" : "pointer" }}>{busy ? "Uploading..." : "Submit Print Job"}</button>
        {message && <p>{message}</p>}
      </form>
    </main>
  );
}