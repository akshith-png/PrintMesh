
import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="card hero-card">
        <p className="eyebrow">PRINTMESH</p>
        <h1>Local printing, without the guesswork.</h1>
        <p className="muted">Send a PDF to a nearby print shop, choose your settings, and track it from upload to completion.</p>
        <div className="hero-actions">
          <Link className="button primary" href="/merchant/login">Merchant sign in</Link>
          <a className="button secondary" href="#how-it-works">How it works</a>
        </div>
      </section>
      <section id="how-it-works" className="card">
        <p className="eyebrow">FOR CUSTOMERS</p>
        <h2>Use your print shop&apos;s QR link</h2>
        <p className="muted">Scan the shop QR code or open its PrintMesh link to upload a PDF and submit a print job. No customer account is required.</p>
        <p className="muted">Merchant links look like <code>/s/YOUR-MERCHANT-ID</code>.</p>
      </section>
    </main>
  );
}
