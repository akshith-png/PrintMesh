"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
export default function MerchantLoginPage(){const router=useRouter();const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[error,setError]=useState("");const[busy,setBusy]=useState(false);async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");const{error}=await createSupabaseBrowserClient().auth.signInWithPassword({email,password});if(error){setError(error.message);setBusy(false);return;}router.replace("/merchant");router.refresh();}return <main className="page-shell"><nav className="portal-nav"><Link className="brand" href="/">PRINT<span>MESH</span></Link><div><Link href="/">Home</Link><Link href="/owner/login">Owner portal</Link></div></nav><section className="card auth-card"><p className="eyebrow">PRINTMESH MERCHANT</p><h1>MERCHANT PORTAL</h1><p className="muted">Manage incoming print jobs, printers and your store availability.</p><form className="form" onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error"><span className="error-reaction" aria-hidden="true">&#x1F92C;</span><span>{error}</span></p>}<button className="button primary" disabled={busy}>{busy?"Signing in...":"Sign in to merchant portal"}</button></form></section><p className="back-link"><Link href="/">&#x2190; Back to PrintMesh home</Link></p></main>}



