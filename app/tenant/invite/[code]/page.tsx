import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Props = { params: Promise<{ code: string }> };

export default async function TenantInvitePage({ params }: Props) {
  const { code } = await params;
  const invite = await prisma.inviteCode.findUnique({
    where: { code },
    include: { Apartment: { select: { name: true, address: true } }, Room: { select: { roomNumber: true } } },
  });
  const isExpired = invite ? invite.expiresAt.getTime() < Date.now() : false;
  const canClaim = !!invite && !invite.usedAt && !isExpired;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "linear-gradient(180deg,#fffdfa 0%,#fff9ed 100%)" }}>
      <section style={{ width: "100%", maxWidth: 520, background: "white", border: "1px solid #f0e5d3", borderRadius: 24, boxShadow: "0 18px 44px rgba(140,94,39,0.12)", padding: 28 }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#2b2131", marginBottom: 8 }}>รับสิทธิ์ห้องพัก</h1>
        {!invite ? (
          <p style={{ color: "#7c6f80" }}>ไม่พบรหัสเชิญนี้</p>
        ) : (
          <>
            <p style={{ color: "#7c6f80", marginBottom: 20 }}>เจ้าของหอพักเชิญให้คุณผูกบัญชีกับห้องนี้</p>
            <div style={{ background: "#fff9ed", border: "1px solid #f0e5d3", borderRadius: 16, padding: 18, marginBottom: 20 }}>
              <div style={{ fontSize: "0.8rem", color: "#7c6f80" }}>หอพัก</div>
              <div style={{ fontWeight: 800, color: "#2b2131", marginBottom: 10 }}>{invite.Apartment.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#7c6f80" }}>ห้อง</div>
              <div style={{ fontWeight: 800, color: "#2b2131" }}>{invite.Room.roomNumber}</div>
            </div>
            {invite.usedAt ? (
              <p style={{ color: "#c0453f" }}>รหัสนี้ถูกใช้ไปแล้ว</p>
            ) : isExpired ? (
              <p style={{ color: "#c0453f" }}>รหัสนี้หมดอายุแล้ว กรุณาขอรหัสใหม่จากเจ้าของหอพัก</p>
            ) : (
              <Link href={`/auth/login?return_to=/tenant/invite/${encodeURIComponent(code)}/claim`} style={{ display: "flex", height: 52, alignItems: "center", justifyContent: "center", borderRadius: 14, background: "#ffc83d", color: "#28202f", fontWeight: 800, textDecoration: "none", boxShadow: "0 6px 0 #dfad2d" }}>
                เข้าสู่ระบบ Daiyooo เพื่อรับสิทธิ์
              </Link>
            )}
          </>
        )}
        {!canClaim && <Link href="/" style={{ display: "inline-block", marginTop: 18, color: "#3d284c" }}>กลับหน้าแรก</Link>}
      </section>
    </main>
  );
}
