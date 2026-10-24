import Link from "next/link";

export default function OwnerLoginPage() {
  return <main className="shell"><section className="card auth-card"><p className="eyebrow">PRINTMESH OWNER</p><h1>Platform owner portal</h1><p className="muted">The owner console manages stores, jobs, agents and printer readiness. Sign in with the authorized owner account to continue.</p><div className="hero-actions"><Link className="button primary" href="/merchant/login?next=/admin">Secure owner sign in <span>→</span></Link><Link className="button secondary" href="/demo/owner">Preview owner console</Link></div><p className="muted auth-note">Owner access is restricted to the configured owner email allowlist. The preview contains no real customer data.</p></section></main>;
}
