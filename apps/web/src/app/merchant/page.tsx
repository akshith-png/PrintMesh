import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AgentEnrollmentPanel } from "./AgentEnrollmentPanel";
import { PrinterSetupPanel } from "./PrinterSetupPanel";
import QRCode from "qrcode";
import { MerchantAvailabilityForm } from "./MerchantAvailabilityForm";
import { MerchantLogoutButton } from "./MerchantLogoutButton";

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
  selected_windows_printer_name?: string | null;
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
        .select("id,name,last_seen_at,status,selected_windows_printer_name")
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
  const publicUrl = `${process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/s/${membership.merchant_id}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { width: 220, margin: 1 });

  return (
    <main className="page-shell"><nav className="portal-nav"><Link className="brand" href="/">PRINT<span>MESH</span></Link><div><Link href="/">Home</Link><Link href="/merchant">Dashboard</Link><Link href="/merchant/password">Password ??</Link></div></nav>
      <header className="dashboard-header">
        <div>
          <p className="back-link"><Link href="/">← PrintMesh home</Link></p>
          <p className="eyebrow">PRINTMESH MERCHANT</p>
          <h1>{merchant?.name ?? "Merchant dashboard"}</h1>
          <p className="muted">{user.email}</p>
          <MerchantAvailabilityForm online={merchant?.status === "ACTIVE"} />
        </div>

        <MerchantLogoutButton />
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
          <p className="eyebrow">CUSTOMER QR</p>
          <h2>Share your print link</h2>
          {/* QR is generated server-side as a data URL so it works offline and has no third-party tracking. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR code for the customer print page" width={220} height={220} />
          <p><a href={publicUrl}>{publicUrl}</a></p>
        </div>
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
          <PrinterSetupPanel printers={printerRows.map((printer) => ({ id: printer.id, name: printer.name, is_available: printer.is_available }))} />

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

          <AgentEnrollmentPanel />

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
                      {agent.selected_windows_printer_name && <span>Selected: {agent.selected_windows_printer_name}</span>}
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

