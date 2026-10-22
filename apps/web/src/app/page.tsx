import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function Home() {
  let stores: Array<{ public_id: string; name: string; address: string | null; phone: string | null }> = [];
  try {
    const admin = createSupabaseAdminClient();
    const result = await admin.from("merchants").select("public_id,name,address,phone").eq("status", "ACTIVE").order("name");
    stores = result.data ?? [];
  } catch {
    // Keep the public shell renderable while deployment secrets are configured.
  }

  return (
    <main className="page-shell">
      <nav className="topbar"><Link className="brand" href="/">PRINT<span>MESH</span></Link><div className="nav-links"><Link href="#stores">Find a store</Link><Link href="/merchant/login">Merchant sign in</Link><Link className="nav-owner" href="/admin">Owner console</Link></div></nav>
      <section className="card hero-card">
        <div className="hero-kicker"><span className="pulse" /> PRINTING, SIMPLIFIED</div><h1>Print nearby.<br /><em>Track every page.</em></h1>
        <p className="muted">Choose a store, upload your PDF, set the print options, and follow the job from submission to completion.</p>
        <div className="hero-actions"><a className="button primary" href="#stores">Start printing <span>→</span></a><Link className="button secondary" href="/merchant/login">Merchant sign in</Link></div>
      </section>
      <section className="audience-grid"><Link className="audience-card customer" href="#stores"><span className="audience-icon">✦</span><strong>Customer printing</strong><span>Upload a PDF, choose settings and send it to a nearby store.</span><b>Find a store →</b></Link><Link className="audience-card merchant" href="/merchant/login"><span className="audience-icon">▣</span><strong>Store dashboard</strong><span>Manage incoming jobs, printers, approvals and your team.</span><b>Merchant sign in →</b></Link><Link className="audience-card owner" href="/admin"><span className="audience-icon">⌘</span><strong>Owner console</strong><span>Control stores, agents, printers and platform operations.</span><b>Open console →</b></Link></section>
      <section id="stores" className="card"><p className="eyebrow">CUSTOMER PRINTING</p><h2>Choose a print store</h2>
        {!stores?.length ? <p className="muted">Stores will appear here when they are available.</p> : <div className="resource-list">{stores.map((store) => <div className="resource-row" key={store.public_id}><div><strong>{store.name}</strong><span>{store.address ?? "Address not provided"}</span>{store.phone && <span>{store.phone}</span>}</div><Link className="button primary" href={`/s/${store.public_id}`}>Upload &amp; print</Link></div>)}</div>}
      </section>
    </main>
  );
}
