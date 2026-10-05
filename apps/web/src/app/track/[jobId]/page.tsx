"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type JobData = {
  job: { id: string; status: string; copies: number; color_mode: string; duplex: boolean; paper_size: string; created_at: string; print_files?: { original_filename: string; size_bytes: number; mime_type: string }[] | { original_filename: string; size_bytes: number; mime_type: string }; };
  events: { id: string; status: string; message: string | null; created_at: string }[];
};

export default function TrackPage() {
  const params = useParams<{ jobId: string }>();
  const [data, setData] = useState<JobData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${params.jobId}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load job.");
      setData(body); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load job."); }
  }, [params.jobId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [load]);

  if (error) return <main className="shell"><section className="card"><h1>Print job</h1><p className="message">{error}</p></section></main>;
  if (!data) return <main className="shell"><section className="card"><h1>Loading print job...</h1></section></main>;

  const file = Array.isArray(data.job.print_files) ? data.job.print_files[0] : data.job.print_files;
  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">PRINTMESH</p>
        <h1>Print job status</h1>
        <div className="status">{data.job.status}</div>
        <p><strong>{file?.original_filename ?? "PDF document"}</strong></p>
        <p className="muted">{data.job.copies} copy/copies · {data.job.color_mode} · {data.job.paper_size} · {data.job.duplex ? "Double-sided" : "Single-sided"}</p>
        <h2>Timeline</h2>
        <ol className="timeline">{data.events.map((event) => <li key={event.id}><strong>{event.status}</strong><span>{event.message ?? ""}</span><small>{new Date(event.created_at).toLocaleString()}</small></li>)}</ol>
      </section>
    </main>
  );
}