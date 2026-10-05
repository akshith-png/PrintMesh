"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function MerchantPrintPage() {
  const params = useParams<{ merchantId: string }>();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState("BW");
  const [duplex, setDuplex] = useState(false);
  const [paperSize, setPaperSize] = useState("A4");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) { setMessage("Choose a PDF first."); return; }
    setBusy(true); setMessage("");
    const form = new FormData();
    form.append("file", file);
    form.append("merchantId", params.merchantId);
    form.append("copies", String(copies));
    form.append("colorMode", colorMode);
    form.append("duplex", String(duplex));
    form.append("paperSize", paperSize);
    try {
      const response = await fetch("/api/jobs", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not submit print job.");
      if (data.jobId) router.push(`/track/${data.jobId}`);
      else setMessage(data.message ?? "PDF validated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit print job.");
    } finally { setBusy(false); }
  }

  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">PRINTMESH</p>
        <h1>Send a document to print</h1>
        <p className="muted">Upload your PDF, choose the print settings, and track it.</p>
        <form onSubmit={submit} className="form">
          <label className="upload">PDF document<input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          <div className="grid">
            <label>Copies<input type="number" min="1" max="100" value={copies} onChange={(e) => setCopies(Number(e.target.value))} /></label>
            <label>Paper<select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}><option value="A4">A4</option><option value="A3">A3</option><option value="LETTER">Letter</option></select></label>
            <label>Color<select value={colorMode} onChange={(e) => setColorMode(e.target.value)}><option value="BW">Black & White</option><option value="COLOR">Color</option></select></label>
          </div>
          <label className="check"><input type="checkbox" checked={duplex} onChange={(e) => setDuplex(e.target.checked)} /> Double-sided</label>
          <button disabled={busy}>{busy ? "Submitting..." : "Submit print job"}</button>
          {message && <p className="message">{message}</p>}
        </form>
      </section>
    </main>
  );
}