"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function MerchantAvailabilityForm({online}:{online:boolean}){const[busy,setBusy]=useState(false);const router=useRouter();async function setAvailability(value:boolean){setBusy(true);const r=await fetch("/api/merchant/status",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({online:value})});setBusy(false);if(r.ok)router.refresh();}return <div className="availability-control"><span className={online?"online-dot":"offline-dot"}>{online?"Online for customers":"Offline — hidden from new customers"}</span><button className="secondary-button" type="button" disabled={busy} onClick={()=>setAvailability(!online)}>{online?"Go offline":"Go online"}</button></div>}
