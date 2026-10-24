import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/owner-auth";
import { StoreCreateForm } from "./StoreCreateForm";
export default async function NewStorePage(){if(!(await requireOwner()))redirect("/owner/login");return <main className="page-shell"><section className="card"><p className="eyebrow">OWNER ONBOARDING</p><h1>Create a store</h1><p className="muted">Create a live Supabase store and merchant login.</p><StoreCreateForm/></section></main>}
