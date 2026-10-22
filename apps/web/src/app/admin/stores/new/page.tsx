import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/owner-auth";
import { StoreCreateForm } from "./StoreCreateForm";
export default async function NewStorePage() { if (!(await requireOwner())) redirect("/merchant/login?next=/admin/stores/new"); return <main className="page-shell"><section className="card"><p className="eyebrow">OWNER ONBOARDING</p><h1>Create a store</h1><p className="muted">Create an active customer-facing store without editing the database.</p><StoreCreateForm /></section></main>; }
