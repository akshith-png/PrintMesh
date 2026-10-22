import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function Home() {
  const admin = createSupabaseAdminClient();
  const { data: stores } = await admin.from("merchants").select("public_id,name,address,phone").eq("status", "ACTIVE").order("name");

  return (
    <main className="page-shell">
      <section className="card hero-card">
        <p className="eyebrow">PRINTMESH</p><h1>Print nearby. Track every page.</h1>
        <p className="muted">Choose a store, upload your PDF, set the print options, and follow the job from submission to completion.</p>
        <div className="hero-actions"><Link className="button primary" href="/merchant/login">Store sign in</Link><a className="button secondary" href="#stores">Find a store</a></div>
      </section>
      <section id="stores" className="card"><p className="eyebrow">CUSTOMER PRINTING</p><h2>Choose a print store</h2>
        {!stores?.length ? <p className="muted">Stores will appear here when they are available.</p> : <div className="resource-list">{stores.map((store) => <div className="resource-row" key={store.public_id}><div><strong>{store.name}</strong><span>{store.address ?? "Address not provided"}</span>{store.phone && <span>{store.phone}</span>}</div><Link className="button primary" href={`/s/${store.public_id}`}>Upload &amp; print</Link></div>)}</div>}
      </section>
    </main>
  );
}
