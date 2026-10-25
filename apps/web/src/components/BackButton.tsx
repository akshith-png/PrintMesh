"use client";
import { useRouter } from "next/navigation";
export function BackButton(){const router=useRouter();return <button type="button" className="back-button" aria-label="Go back" onClick={()=>router.back()}>←</button>}
