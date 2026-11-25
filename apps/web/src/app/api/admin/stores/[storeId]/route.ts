import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function findStore(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  key: string,
) {
  const byId = await admin
    .from("merchants")
    .select("id,name")
    .eq("id", key)
    .maybeSingle();
  if (byId.data) return byId.data;
  const byPublicId = await admin
    .from("merchants")
    .select("id,name")
    .eq("public_id", key)
    .maybeSingle();
  return byPublicId.data;
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const owner = await requireOwner();
  if (!owner)
    return NextResponse.json(
      { error: "Owner access required" },
      { status: 403 },
    );
  const { storeId } = await params;
  const body = await request.json().catch(() => ({}));
  if (String(body.confirmation ?? "") !== "DELETE")
    return NextResponse.json(
      { error: "Type DELETE to permanently remove this store." },
      { status: 400 },
    );
  const admin = createSupabaseAdminClient();
  const store = await findStore(admin, storeId);
  if (!store)
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  const { error } = await admin.from("merchants").delete().eq("id", store.id);
  if (error)
    return NextResponse.json(
      {
        error: "Could not delete store. Archive it instead if it has history.",
      },
      { status: 400 },
    );
  await admin.from("owner_audit_logs").insert({
    actor_user_id: owner.user.id,
    action: "STORE_DELETED",
    target_type: "merchant",
    target_id: storeId,
    reason: "Owner confirmed DELETE",
    before_state: store,
    after_state: null,
  });
  return NextResponse.json({ ok: true });
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const owner = await requireOwner();
  if (!owner)
    return NextResponse.json(
      { error: "Owner access required" },
      { status: 403 },
    );
  const { storeId } = await params;
  const body = await request.json();
  const lifecycle = [
    "DRAFT",
    "PENDING",
    "ACTIVE",
    "OFFLINE",
    "SUSPENDED",
    "BLACKLISTED",
    "ARCHIVED",
  ].includes(body.lifecycle)
    ? body.lifecycle
    : null;
  const admin = createSupabaseAdminClient();
  const { data: before } = await admin
    .from("merchants")
    .select(
      "id,name,address,phone,status,lifecycle_status,status_reason",
    )
    .eq("id", storeId)
    .maybeSingle();
  const resolvedBefore =
    before ??
    (
      await admin
        .from("merchants")
        .select(
          "id,name,address,phone,status,lifecycle_status,status_reason",
        )
        .eq("public_id", storeId)
        .maybeSingle()
    ).data;
  const current = resolvedBefore ?? {
    id: storeId,
    name: "",
    address: null,
    phone: null,
    status: "ACTIVE",
    lifecycle_status: "ACTIVE",
    status_reason: null,
  };
  if (!lifecycle)
    return NextResponse.json(
      { error: "Unsupported store lifecycle status" },
      { status: 400 },
    );
  const reason = String(body.reason ?? "").trim();
  if (lifecycle !== current.lifecycle_status && !reason)
    return NextResponse.json(
      { error: "A reason is required" },
      { status: 400 },
    );
  const next = {
    name: String(body.name ?? current.name).trim(),
    address: String(body.address ?? current.address ?? "").trim() || null,
    phone: String(body.phone ?? current.phone ?? "").trim() || null,
    lifecycle_status: lifecycle,
    status_reason: reason || null,
    status: lifecycle === "ACTIVE" ? "ACTIVE" : "DISABLED",
    updated_at: new Date().toISOString(),
  };
  if (body.merchant_email) {
    const { data: assignment } = await admin
      .from("merchant_users")
      .select("auth_user_id")
      .eq("merchant_id", current.id)
      .maybeSingle();
    if (assignment?.auth_user_id) {
      const email = String(body.merchant_email).trim().toLowerCase();
      const { error: authError } = await admin.auth.admin.updateUserById(
        assignment.auth_user_id,
        { email, email_confirm: true },
      );
      if (authError)
        return NextResponse.json(
          { error: "Could not update merchant login email" },
          { status: 400 },
        );
    }
  }
  const { error } = await admin
    .from("merchants")
    .update(next)
    .eq("id", current.id);
  if (error)
    return NextResponse.json(
      { error: `Could not update store: ${error.message}` },
      { status: 400 },
    );
  await admin.from("owner_audit_logs").insert({
    actor_user_id: owner.user.id,
    action: `STORE_${lifecycle}`,
    target_type: "merchant",
    target_id: storeId,
    reason: reason || null,
    before_state: current,
    after_state: next,
  });
  return NextResponse.json({ ok: true });
}
