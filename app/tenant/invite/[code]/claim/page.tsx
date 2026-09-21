"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClaimInvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [message, setMessage] = useState("กำลังรับสิทธิ์ห้องพัก...");

  useEffect(() => {
    const code = params.code;
    fetch(`/api/tenant/invites/${encodeURIComponent(code)}/claim`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "รับสิทธิ์ไม่สำเร็จ");
        router.replace(data.redirectTo || "/tenant/dashboard");
      })
      .catch((err: unknown) => setMessage(err instanceof Error ? err.message : "รับสิทธิ์ไม่สำเร็จ"));
  }, [params.code, router]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#fff9ed" }}>
      <div style={{ background: "white", border: "1px solid #f0e5d3", borderRadius: 18, padding: 28, color: "#2b2131" }}>{message}</div>
    </main>
  );
}
