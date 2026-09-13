import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (session.role === "admin") {
    redirect("/admin/locations");
  }
  if (session.role === "tenant") {
    redirect("/tenant/dashboard");
  }
  // Not logged in — show selection page
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg-light)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏢</div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 8 }}>ApartmentOAT</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 32 }}>ระบบจัดการหอพัก</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <a href="/admin/login" className="btn btn-primary">เข้าสู่ระบบผู้ดูแล</a>
          <a href="/tenant/login" className="btn btn-success">เข้าสู่ระบบผู้เช่า</a>
        </div>
      </div>
    </div>
  );
}
