import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Job = {
  id: string;
  status: string;
  created_at: string;
  copies: number;
  color_mode: string;
  duplex: boolean;
};

type Printer = {
  id: string;
  name: string;
  status?: string | null;
  is_available?: boolean | null;
};

type Agent = {
  id: string;
  name?: string | null;
  last_seen_at?: string | null;
  status?: string | null;
};

export default async function MerchantDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/merchant/login");
  }

  const { data: membership } = await supabase
    .from("merchant_users")
    .select("merchant_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <main className="page-shell">
        <section className="card">
          <p className="eyebrow">PRINTMESH MERCHANT</p>
          <h1>No merchant assigned</h1>
          <p className="muted">
            Your account is authenticated, but it has not been assigned to a merchant yet.
          </p>
        </section>
      </main>
    );
  }

  const [{ data: merchant }, { data: jobs }, { data: printers }, { data: agents }] =
    await Promise.all([
      supabase.from("merchants").select("*").eq("id", membership.merchant_id).maybeSingle(),
      supabase
        .from("print_jobs")
        .select("id,status,created_at,copies,color_mode,duplex")
        .eq("merchant_id", membership.merchant_id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("printers")
        .select("id,name,status,is_available")
        .eq("merchant_id", membership.merchant_id)
        .order("name"),
      supabase
        .from("agent_instances")
        .select("id,name,last_seen_at,status")
        .eq("merchant_id", membership.merchant_id)
        .order("last_seen_at", { ascending: false }),
    ]);

  const jobRows = (jobs ?? []) as Job[];
  const printerRows = (printers ?? []) as Printer[];
const agentRows = (agents ?? []) as Agent[];
  const queued = jobRows.filter((job) =>
    ["CREATED", "UPLOADED", "QUEUED", "CLAIMED"].includes(job.status)
  ).length;

  const printing = jobRows.filter((job) => job.status === "PRINTING").length;
  const completed = jobRows.filter((job) => job.status === "COMPLETED").length;

  return (
    <main className="page-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">PRINTMESH MERCHANT</p>
          <h1>{merchant?.name ?? "Merchant dashboard"}</h1>
          <p className="muted">{user.email}</p>
        </div>

        <form action="/api/merchant/logout" method="post">
          <button className="secondary-button" type="submit">
            Sign out
          </button>
        </form>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Queued</span>
          <strong>{queued}</strong>
        </div>
        <div className="stat-card">
          <span>Printing</span>
          <strong>{printing}</strong>
        </div>
        <div className="stat-card">
          <span>Completed</span>
          <strong>{completed}</strong>
        </div>
        <div className="stat-card">
          <span>Printers</span>
          <strong>{printerRows.length}</strong>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">JOBS</p>
              <h2>Recent print jobs</h2>
            </div>
          </div>

          {jobRows.length === 0 ? (
            <p className="muted">No print jobs yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Copies</th>
                    <th>Mode</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobRows.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <code>{job.id.slice(0, 8)}</code>
                      </td>
                      <td>
                        <span className={`status status-${job.status.toLowerCase()}`}>
                          {job.status}
                        </span>
                      </td>
                      <td>{job.copies}</td>
                      <td>{job.color_mode}{job.duplex ? " / Duplex" : " / Single"}</td>
                      <td>{new Date(job.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <p className="eyebrow">PRINTERS</p>
          <h2>Printer availability</h2>

          {printerRows.length === 0 ? (
            <p className="muted">No printers registered yet.</p>
          ) : (
            <div className="resource-list">
              {printerRows.map((printer) => (
                <div className="resource-row" key={printer.id}>
                  <div>
                    <strong>{printer.name}</strong>
                    <span>{printer.status ?? "UNKNOWN"}</span>
                  </div>
                  <span className={printer.is_available ? "online-dot" : "offline-dot"}>
                    {printer.is_available ? "Available" : "Unavailable"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <p className="eyebrow">AGENT</p>
          <h2>Windows agent</h2>

          {agentRows.length === 0 ? (
            <p className="muted">No agent installation registered yet.</p>
          ) : (
            <div className="resource-list">
              {agentRows.map((agent) => {
                const online = agent.status?.toUpperCase() === 'ONLINE';

                return (
                  <div className="resource-row" key={agent.id}>
                    <div>
                      <strong>{agent.name ?? "PrintMesh Agent"}</strong>
                      <span>
                        {agent.last_seen_at
                          ? `Last seen ${new Date(agent.last_seen_at).toLocaleString()}`
                          : "Never connected"}
                      </span>
                    </div>
                    <span className={online ? "online-dot" : "offline-dot"}>
                      {online ? "Online" : "Offline"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
