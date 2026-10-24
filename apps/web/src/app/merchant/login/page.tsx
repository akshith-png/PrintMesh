"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function MerchantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    let signInError;
    try {
      const supabase = createSupabaseBrowserClient();
      ({ error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Merchant authentication is unavailable.");
      setLoading(false);
      return;
    }

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.replace("/merchant");
    router.refresh();
  }

  return (
    <main className="page-shell">
      <section className="card auth-card">
        <p className="eyebrow">PRINTMESH MERCHANT</p>
        <h1>Merchant login</h1>
        <p className="muted">
          Sign in to manage print jobs, printers and your PrintMesh agent.
        </p>

        <form className="stack" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <Link className="button secondary" href="/demo/merchant">Preview merchant dashboard</Link>
        </form>
      </section>
    </main>
  );
}
