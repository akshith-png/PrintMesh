import Link from "next/link";

export default function CustomerDashboard() {
  return (
    <main className="page-shell">
      <nav className="topbar"><Link className="brand" href="/">PRINT<span>MESH</span></Link><div className="nav-links"><Link href="/">Home</Link><Link href="/merchant/login">Merchant sign in</Link></div></nav>
      <section className="card hero-card">
        <div className="hero-kicker"><span className="pulse" /> CUSTOMER PRINTING</div>
        <h1>Your print desk,<br /><em>wherever you are.</em></h1>
        <p className="muted">Choose a nearby store, upload your PDF, set paper and color options, and follow your job from upload to completion.</p>
        <div className="hero-actions"><Link className="button primary" href="/#stores">Choose a store <span>→</span></Link><Link className="button secondary" href="/">Back home</Link></div>
      </section>
      <section className="audience-grid">
        <div className="audience-card customer"><span className="audience-icon">1</span><strong>Choose a store</strong><span>Open the store link shared by your print shop or select one from the homepage.</span></div>
        <div className="audience-card merchant"><span className="audience-icon">2</span><strong>Set your options</strong><span>Upload a PDF and choose copies, A4, color or black-and-white, and duplex printing.</span></div>
        <div className="audience-card owner"><span className="audience-icon">3</span><strong>Track the job</strong><span>Your tracking link shows queue, approval, printing, and completion status.</span></div>
      </section>
    </main>
  );
}
