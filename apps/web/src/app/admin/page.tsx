import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/owner-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const owner = await requireOwner();
  if (!owner) redirect("/merchant/login?next=/admin");
  const admin = createSupabaseAdminClient();
  const [{ data: stores }, { count: jobs }] = await Promise.all([
    admin.from("merchants").select("id,public_id,name,address,phone,status,created_at").order("created_at", { ascending: false }),
    admin.from("print_jobs").select("id", { count: "exact", head: true }),
  ]);
  const active = (stores ?? []).filter((s) => s.status === "ACTIVE").length;
  return <main className="page-shell"><header className="dashboard-header"><div><p className="eyebrow">PRINTMESH OWNER</p><h1>Platform operations</h1><p className="muted">{owner.user.email}</p></div><Link className="button primary" href="/admin/stores/new">Add store</Link></header><section className="stats-grid"><div className="stat-card"><span>Total stores</span><strong>{stores?.length ?? 0}</strong></div><div className="stat-card"><span>Active stores</span><strong>{active}</strong></div><div className="stat-card"><span>All jobs</span><strong>{jobs ?? 0}</strong></div></section><section className="card"><div className="section-heading"><div><p className="eyebrow">STORES</p><h2>Store directory</h2></div></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Address</th><th>Status</th><th>Customer page</th></tr></thead><tbody>{(stores ?? []).map((store) => <tr key={store.id}><td><strong>{store.name}</strong><br /><code>{store.public_id}</code></td><td>{store.address ?? "—"}<br />{store.phone ?? ""}</td><td><span className={`status status-${String(store.status).toLowerCase()}`}>{store.status}</span></td><td><Link href={`/s/${store.public_id}`}>Open customer page</Link></td></tr>)}</tbody></table></div></section></main>;
}
