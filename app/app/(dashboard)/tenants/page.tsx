"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";

interface Location { id: number; name: string }
interface Room { id: number; roomNumber: string; roomType: string | null; location: { id?: number; name: string } }
interface Tenant {
  id: number;
  name: string;
  email: string;
  roomId: number | null;
  createdAt: string;
  room: Room | null;
  latestBillStatus: string | null;
}
interface Invite {
  id: number;
  code: string;
  url: string;
  roomId: number;
  room: { id: number; roomNumber: string };
  expiresAt: string;
  usedAt: string | null;
  usedBy: { id: number; displayName: string | null; email: string | null } | null;
  createdAt: string;
  status: "ACTIVE" | "USED" | "EXPIRED";
}
interface SlipBill {
  id: number;
  period: string;
  total: number;
  paymentStatus: string;
  paymentSlipUrl: string | null;
  paymentSubmittedAt: string | null;
  paymentNote: string | null;
  room: { id: number; roomNumber: string; location: { id: number; name: string }; tenant: { id: number; name: string; email: string } | null };
}

function fmt(n: number) { return n.toLocaleString("th-TH", { maximumFractionDigits: 2 }); }
function thaiPeriod(period: string) {
  const [y, m] = period.split("-");
  const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return `${months[Number(m) - 1]} ${Number(y) + 543}`;
}

export default function AdminTenantsPage() {
  const [activeTab, setActiveTab] = useState<"tenants" | "invites" | "slips">("tenants");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [slips, setSlips] = useState<SlipBill[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SlipBill | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadTenants = useCallback(async () => {
    const data = await fetch("/api/admin/tenants").then((r) => r.json());
    setTenants(data);
  }, []);

  const loadSlips = useCallback(async () => {
    const data = await fetch("/api/admin/slips").then((r) => r.json());
    setSlips(data);
  }, []);

  const loadInvites = useCallback(async (apartmentId: string) => {
    if (!apartmentId) { setInvites([]); return; }
    const data = await fetch(`/api/admin/invites?apartmentId=${apartmentId}`).then((r) => r.json());
    setInvites(data);
  }, []);

  useEffect(() => {
    Promise.all([fetch("/api/locations").then((r) => r.json()), fetch("/api/rooms").then((r) => r.json()), fetch("/api/admin/tenants").then((r) => r.json()), fetch("/api/admin/slips").then((r) => r.json())])
      .then(([locs, roomData, tenantData, slipData]) => {
        setLocations(locs); setRooms(roomData); setTenants(tenantData); setSlips(slipData);
        if (locs[0]?.id) setSelectedLocationId(String(locs[0].id));
      })
      .catch(() => setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadInvites(selectedLocationId).catch(() => undefined); }, [selectedLocationId, loadInvites]);

  const occupiedRoomIds = useMemo(() => new Set(tenants.map((t) => t.roomId).filter(Boolean)), [tenants]);
  const availableRooms = rooms.filter((r) => !occupiedRoomIds.has(r.id) && (!selectedLocationId || String((r.location as { id?: number }).id ?? "") === selectedLocationId || locations.find((l) => String(l.id) === selectedLocationId)?.name === r.location.name));

  const createInvite = async () => {
    if (!selectedRoomId) { setToast({ message: "กรุณาเลือกห้อง", type: "error" }); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: Number(selectedRoomId) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างลิงก์ไม่สำเร็จ");
      setGeneratedLink(data.url);
      setToast({ message: "สร้างลิงก์เชิญแล้ว", type: "success" });
      await loadInvites(selectedLocationId);
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally { setBusy(false); }
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => setToast({ message: "คัดลอกแล้ว", type: "success" }));

  const removeTenant = async (tenant: Tenant) => {
    if (!confirm(`ยกเลิกสิทธิ์ห้องของ ${tenant.name}?`)) return;
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, { method: "DELETE" });
    if (res.ok) { setToast({ message: "ยกเลิกสิทธิ์แล้ว", type: "success" }); loadTenants(); } else { setToast({ message: "ยกเลิกสิทธิ์ไม่สำเร็จ", type: "error" }); }
  };

  const slipAction = async (slip: SlipBill, action: "approve" | "reject") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/slips/${slip.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason: rejectReason }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setToast({ message: action === "approve" ? "อนุมัติสลิปแล้ว" : "ปฏิเสธสลิปแล้ว", type: "success" });
      setRejectTarget(null); setRejectReason(""); await loadSlips(); await loadTenants();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally { setBusy(false); }
  };

  if (loading) return <><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}><h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: "3rem" }}>👥</span>ผู้เช่า</h1></div><div style={{ textAlign: "center", padding: 64, fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700 }}>กำลังโหลด...</div></>;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 20 }}>
        <div>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "3rem" }}>👥</span>
            ผู้เช่า
          </h1>
          <p style={{ color: "#64748B", marginTop: 8, fontSize: "0.95rem", fontWeight: 600 }}>เชิญผู้เช่าด้วยลิงก์ และตรวจสลิปชำระเงิน</p>
        </div>
        <button
          style={{
            padding: "14px 28px",
            borderRadius: 16,
            fontSize: "1rem",
            fontWeight: 900,
            background: "#7FDB9A",
            border: "4px solid #2C3E50",
            color: "#2C3E50",
            cursor: "pointer",
          }}
          onClick={() => setActiveTab("invites")}
        >
          + สร้างลิงก์เชิญ
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 16, padding: "20px 24px" }}>
          <div style={{ fontSize: "0.875rem", color: "#64748B", fontWeight: 700, marginBottom: 4 }}>ผู้เช่าทั้งหมด</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 900, color: "#2C3E50" }}>{tenants.length}</div>
        </div>
        <div style={{ background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 16, padding: "20px 24px" }}>
          <div style={{ fontSize: "0.875rem", color: "#64748B", fontWeight: 700, marginBottom: 4 }}>ลิงก์ยังใช้ได้</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 900, color: "#2C3E50" }}>{invites.filter((i) => i.status === "ACTIVE").length}</div>
        </div>
        <div style={{ background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 16, padding: "20px 24px" }}>
          <div style={{ fontSize: "0.875rem", color: "#64748B", fontWeight: 700, marginBottom: 4 }}>สลิปรอยืนยัน</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 900, color: slips.length ? "#EF4444" : "#2C3E50" }}>{slips.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }} role="tablist">
        <Tab active={activeTab === "tenants"} onClick={() => setActiveTab("tenants")}>รายชื่อผู้เช่า</Tab>
        <Tab active={activeTab === "invites"} onClick={() => setActiveTab("invites")}>ลิงก์เชิญ</Tab>
        <Tab active={activeTab === "slips"} onClick={() => setActiveTab("slips")}>สลิปรอยืนยัน {slips.length ? `(${slips.length})` : ""}</Tab>
      </div>

      {activeTab === "tenants" && <div className="table-container"><table><thead><tr><th>ผู้เช่า</th><th>ห้อง</th><th>หอพัก</th><th>สถานะบิล</th><th style={{ textAlign: "right" }}>จัดการ</th></tr></thead><tbody>{tenants.length === 0 ? <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "#64748B" }}>ยังไม่มีผู้เช่า — สร้างลิงก์เชิญเพื่อเริ่มต้น</td></tr> : tenants.map((t) => <tr key={t.id}><td><strong>{t.name}</strong><div style={{ fontSize: 12, color: "#64748B" }}>{t.email}</div></td><td>{t.room?.roomNumber ?? "—"}</td><td>{t.room?.location.name ?? "—"}</td><td>{t.latestBillStatus === "PAID" ? <span className="badge badge-success">จ่ายแล้ว</span> : t.latestBillStatus === "SUBMITTED" ? <span className="badge badge-info">รอยืนยัน</span> : t.latestBillStatus === "UNPAID" ? <span className="badge badge-warning">ค้างชำระ</span> : "—"}</td><td style={{ textAlign: "right" }}><button style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.875rem", fontWeight: 700, background: "#FFD93D", border: "3px solid #2C3E50", color: "#2C3E50", cursor: "pointer" }} onClick={() => removeTenant(t)}>ยกเลิกสิทธิ์</button></td></tr>)}</tbody></table></div>}

      {activeTab === "invites" && <div style={{ display: "grid", gap: 20 }}>
        <div style={{ background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 20, padding: 24 }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#2C3E50", marginBottom: 16 }}>สร้างลิงก์เชิญผู้เช่า</h2>
          <div className="form-row"><div className="form-group"><label>หอพัก</label><select value={selectedLocationId} onChange={(e) => { setSelectedLocationId(e.target.value); setSelectedRoomId(""); }}><option value="">-- เลือกหอพัก --</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div><div className="form-group"><label>ห้องว่าง</label><select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)}><option value="">-- เลือกห้อง --</option>{availableRooms.map((r) => <option key={r.id} value={r.id}>ห้อง {r.roomNumber}{r.roomType ? ` (${r.roomType})` : ""}</option>)}</select></div></div>
          <button
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              fontSize: "0.95rem",
              fontWeight: 900,
              background: busy || !selectedRoomId ? "#CBD5E1" : "#7FDB9A",
              border: "4px solid #2C3E50",
              color: "#2C3E50",
              cursor: busy || !selectedRoomId ? "not-allowed" : "pointer",
            }}
            disabled={busy || !selectedRoomId}
            onClick={createInvite}
          >
            {busy ? "กำลังสร้าง..." : "สร้างลิงก์เชิญ"}
          </button>
          {generatedLink && <div style={{ marginTop: 16, padding: 16, background: "#FFF8F0", border: "3px solid #2C3E50", borderRadius: 12, wordBreak: "break-all" }}><strong style={{ fontWeight: 900 }}>ลิงก์ล่าสุด:</strong> {generatedLink} <button style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.875rem", fontWeight: 700, background: "#B8D8E8", border: "3px solid #2C3E50", color: "#2C3E50", cursor: "pointer", marginLeft: 8 }} onClick={() => copy(generatedLink)}>คัดลอก</button></div>}
        </div>
        <div className="table-container"><table><thead><tr><th>ห้อง</th><th>รหัส</th><th>สถานะ</th><th>หมดอายุ</th><th>ลิงก์</th></tr></thead><tbody>{invites.length === 0 ? <tr><td colSpan={5} style={{ textAlign: "center", padding: 24 }}>ยังไม่มีลิงก์</td></tr> : invites.map((i) => <tr key={i.id}><td>{i.room.roomNumber}</td><td style={{ fontFamily: "monospace" }}>{i.code}</td><td>{i.status === "ACTIVE" ? <span className="badge badge-success">ใช้ได้</span> : i.status === "USED" ? <span className="badge badge-info">ใช้แล้ว</span> : <span className="badge badge-warning">หมดอายุ</span>}</td><td>{new Date(i.expiresAt).toLocaleDateString("th-TH")}</td><td><button style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.875rem", fontWeight: 700, background: "#B8D8E8", border: "3px solid #2C3E50", color: "#2C3E50", cursor: "pointer" }} onClick={() => copy(i.url)}>คัดลอก</button></td></tr>)}</tbody></table></div>
      </div>}

      {activeTab === "slips" && <div className="table-container"><table><thead><tr><th>ผู้เช่า</th><th>ห้อง</th><th>เดือน</th><th>ยอด</th><th>สลิป</th><th style={{ textAlign: "right" }}>จัดการ</th></tr></thead><tbody>{slips.length === 0 ? <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#64748B" }}>ไม่มีสลิปรอยืนยัน</td></tr> : slips.map((s) => <tr key={s.id}><td><strong>{s.room.tenant?.name ?? "—"}</strong><div style={{ fontSize: 12, color: "#64748B" }}>{s.room.tenant?.email}</div></td><td>{s.room.location.name} / {s.room.roomNumber}</td><td>{thaiPeriod(s.period)}</td><td>{fmt(s.total)}</td><td>{s.paymentSlipUrl ? <a style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.875rem", fontWeight: 700, background: "#B8D8E8", border: "3px solid #2C3E50", color: "#2C3E50", textDecoration: "none", display: "inline-block" }} href={s.paymentSlipUrl} target="_blank">ดูสลิป</a> : "—"}</td><td style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}><button style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.875rem", fontWeight: 700, background: busy ? "#CBD5E1" : "#7FDB9A", border: "3px solid #2C3E50", color: "#2C3E50", cursor: busy ? "not-allowed" : "pointer" }} disabled={busy} onClick={() => slipAction(s, "approve")}>อนุมัติ</button> <button style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.875rem", fontWeight: 700, background: busy ? "#CBD5E1" : "#FFD93D", border: "3px solid #2C3E50", color: "#2C3E50", cursor: busy ? "not-allowed" : "pointer" }} disabled={busy} onClick={() => setRejectTarget(s)}>ปฏิเสธ</button></td></tr>)}</tbody></table></div>}

      {rejectTarget && <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRejectTarget(null)}><div className="modal" style={{ maxWidth: 440 }}><div className="modal-header"><h2 className="modal-title">ปฏิเสธสลิป</h2><button className="modal-close" onClick={() => setRejectTarget(null)}>✕</button></div><div className="modal-body"><div className="form-group"><label>เหตุผล</label><textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ width: "100%" }} /></div></div><div className="modal-footer"><button style={{ padding: "12px 24px", borderRadius: 12, fontSize: "0.95rem", fontWeight: 900, background: "#FFFFFF", border: "4px solid #2C3E50", color: "#2C3E50", cursor: "pointer" }} onClick={() => setRejectTarget(null)}>ยกเลิก</button><button style={{ padding: "12px 24px", borderRadius: 12, fontSize: "0.95rem", fontWeight: 900, background: busy || !rejectReason.trim() ? "#CBD5E1" : "#FFD93D", border: "4px solid #2C3E50", color: "#2C3E50", cursor: busy || !rejectReason.trim() ? "not-allowed" : "pointer" }} disabled={busy || !rejectReason.trim()} onClick={() => slipAction(rejectTarget, "reject")}>ยืนยัน</button></div></div></div>}
    </>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button role="tab" aria-selected={active} onClick={onClick} style={{ padding: "10px 20px", borderRadius: 12, border: `3px solid ${active ? "#2C3E50" : "#2C3E50"}`, background: active ? "#FFD93D" : "#FFFFFF", color: "#2C3E50", fontWeight: 900, cursor: "pointer", fontSize: "0.95rem" }}>{children}</button>;
}
