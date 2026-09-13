"use client";

import { useState, useEffect, useCallback } from "react";
import Toast from "@/components/Toast";

interface SlipBill {
  id: number;
  period: string;
  total: number;
  paymentStatus: string;
  paymentSlipUrl: string | null;
  paymentSubmittedAt: string | null;
  paymentNote: string | null;
  room: {
    id: number;
    roomNumber: string;
    location: { id: number; name: string };
    tenant: { id: number; name: string; email: string } | null;
  };
}

interface Location {
  id: number;
  name: string;
}

interface Room {
  id: number;
  roomNumber: string;
  roomType: string | null;
  location: { id?: number; name: string };
}

interface Tenant {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  roomId: number | null;
  moveInDate: string | null;
  deposit: number | null;
  isActive: boolean;
  createdAt: string;
  room: Room | null;
  latestBillStatus: string | null;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function thaiPeriod(period: string) {
  const [y, m] = period.split("-");
  const thaiYear = Number(y) + 543;
  const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return `${monthNames[Number(m) - 1]} ${thaiYear}`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#2D5BE3" },
  { bg: "#ECFDF5", text: "#059669" },
  { bg: "#FFFBEB", text: "#D97706" },
  { bg: "#F0F9FF", text: "#0284C7" },
  { bg: "#FFF1F2", text: "#E11D48" },
];

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"tenants" | "slips">("tenants");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Slip review state
  const [slips, setSlips] = useState<SlipBill[]>([]);
  const [slipsLoading, setSlipsLoading] = useState(false);
  const [slipPreview, setSlipPreview] = useState<SlipBill | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; slip: SlipBill } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [slipActionLoading, setSlipActionLoading] = useState(false);

  // Modal states
  const [tenantModal, setTenantModal] = useState<{ open: boolean; mode: "add" | "edit"; tenant?: Tenant }>({ open: false, mode: "add" });
  const [pinModal, setPinModal] = useState<{ open: boolean; pin: string; tenantName: string; tenantId: number; tenantEmail?: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; tenant: Tenant } | null>(null);

  // Form state
  const [form, setForm] = useState({ name: "", email: "", phone: "", roomId: "", moveInDate: "", deposit: "", isActive: true });
  const [formLoading, setFormLoading] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tenants");
      const data = await res.json();
      setTenants(data);
    } catch {
      setToast({ message: "โหลดข้อมูลผู้เช่าล้มเหลว", type: "error" });
    }
  }, []);

  const loadSlips = useCallback(async () => {
    setSlipsLoading(true);
    try {
      const res = await fetch("/api/admin/slips");
      const data = await res.json();
      setSlips(data);
    } catch {
      setToast({ message: "โหลดสลิปล้มเหลว", type: "error" });
    } finally {
      setSlipsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/tenants").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/rooms").then((r) => r.json()),
      fetch("/api/admin/slips").then((r) => r.json()),
    ])
      .then(([tData, lData, rData, sData]) => {
        setTenants(tData);
        setLocations(lData);
        setAllRooms(rData);
        setSlips(sData);
      })
      .catch(() => setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" }))
      .finally(() => setLoading(false));
  }, [loadSlips]);

  // Rooms not yet occupied (for form dropdown) — exclude the room the currently-edited tenant is in
  const availableRooms = (editingTenantId?: number) => {
    const occupiedRoomIds = tenants
      .filter((t) => t.roomId && t.id !== editingTenantId)
      .map((t) => t.roomId!);
    return allRooms.filter((r) => !occupiedRoomIds.includes(r.id));
  };

  const openAddModal = () => {
    setForm({ name: "", email: "", phone: "", roomId: "", moveInDate: "", deposit: "", isActive: true });
    setTenantModal({ open: true, mode: "add" });
  };

  const openEditModal = (t: Tenant) => {
    setForm({
      name: t.name,
      email: t.email,
      phone: t.phone ?? "",
      roomId: t.roomId ? String(t.roomId) : "",
      moveInDate: t.moveInDate ? t.moveInDate.slice(0, 10) : "",
      deposit: t.deposit !== null ? String(t.deposit) : "",
      isActive: t.isActive,
    });
    setTenantModal({ open: true, mode: "edit", tenant: t });
  };

  const saveTenant = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setToast({ message: "กรุณากรอกชื่อและอีเมล", type: "error" });
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        roomId: form.roomId ? Number(form.roomId) : null,
        moveInDate: form.moveInDate || null,
        deposit: form.deposit ? Number(form.deposit) : null,
        isActive: form.isActive,
      };

      if (tenantModal.mode === "add") {
        const res = await fetch("/api/admin/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        // Show PIN modal immediately after create
        setTenantModal({ open: false, mode: "add" });
        setPinModal({ open: true, pin: data.pin, tenantName: data.tenant.name, tenantId: data.tenant.id, tenantEmail: data.tenant.email });
        setToast({ message: "เพิ่มผู้เช่าสำเร็จ", type: "success" });
      } else if (tenantModal.tenant) {
        const res = await fetch(`/api/admin/tenants/${tenantModal.tenant.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTenantModal({ open: false, mode: "edit" });
        setToast({ message: "แก้ไขข้อมูลสำเร็จ", type: "success" });
      }
      await loadTenants();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setFormLoading(false);
    }
  };

  const regeneratePin = async (tenantId: number, tenantName: string, tenantEmail?: string) => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-pin" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPinModal({ open: true, pin: data.pin, tenantName, tenantId, tenantEmail });
      setToast({ message: "สร้าง PIN ใหม่สำเร็จ", type: "success" });
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    }
  };

  const sendPinEmail = async (tenantId: number, pin: string) => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/send-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.devLog) {
        setToast({ message: "Dev mode: PIN ถูก log ลง console แล้ว (ไม่มี SMTP)", type: "info" });
      } else {
        setToast({ message: "ส่งอีเมล PIN สำเร็จ", type: "success" });
      }
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "ส่งอีเมลล้มเหลว", type: "error" });
    }
  };

  const approveSlip = async (slip: SlipBill) => {
    setSlipActionLoading(true);
    try {
      const res = await fetch(`/api/admin/slips/${slip.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: "อนุมัติสลิปสำเร็จ — บิลเป็นจ่ายแล้ว", type: "success" });
      setSlipPreview(null);
      await Promise.all([loadSlips(), loadTenants()]);
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setSlipActionLoading(false);
    }
  };

  const rejectSlip = async () => {
    if (!rejectModal?.slip) return;
    if (!rejectReason.trim()) {
      setToast({ message: "กรุณาระบุเหตุผล", type: "error" });
      return;
    }
    setSlipActionLoading(true);
    try {
      const res = await fetch(`/api/admin/slips/${rejectModal.slip.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: "ปฏิเสธสลิปแล้ว", type: "success" });
      setRejectModal(null);
      setRejectReason("");
      setSlipPreview(null);
      await Promise.all([loadSlips(), loadTenants()]);
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setSlipActionLoading(false);
    }
  };

  const deleteTenant = async () => {
    if (!deleteModal?.tenant) return;
    try {
      const res = await fetch(`/api/admin/tenants/${deleteModal.tenant.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบล้มเหลว");
      setDeleteModal(null);
      setToast({ message: "ลบผู้เช่าออกแล้ว", type: "success" });
      await loadTenants();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    }
  };

  const copyPin = (pin: string) => {
    navigator.clipboard?.writeText(pin).then(() => setToast({ message: "คัดลอก PIN แล้ว", type: "success" }));
  };

  const filteredTenants = tenants.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.room?.roomNumber ?? "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: tenants.length,
    withRoom: tenants.filter((t) => t.roomId).length,
    pendingSlips: slips.length,
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">ผู้เช่า</h1>
        </div>
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-secondary)" }}>กำลังโหลด...</div>
      </>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">ผู้เช่า</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginTop: 4 }}>
            จัดการผู้เช่า, ผูกห้อง, ส่ง PIN และตรวจสอบสลิปชำระ
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            เพิ่มผู้เช่า
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="summary-cards" style={{ marginBottom: 24 }}>
        <div className="summary-card">
          <div className="summary-card-label">ผู้เช่าทั้งหมด</div>
          <div className="summary-card-value">{stats.total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">ผูกห้องแล้ว</div>
          <div className="summary-card-value" style={{ color: "var(--color-success)" }}>{stats.withRoom}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">สลิปรอยืนยัน</div>
          <div className="summary-card-value" style={{ color: stats.pendingSlips > 0 ? "var(--color-error)" : "var(--color-text-primary)" }}>
            {stats.pendingSlips}
          </div>
          {stats.pendingSlips > 0 && (
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 2 }}>ต้องตรวจสอบ</div>
          )}
        </div>
      </div>

      {/* Tab pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }} role="tablist">
        <TabPill active={activeTab === "tenants"} onClick={() => setActiveTab("tenants")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          </svg>
          รายชื่อผู้เช่า
        </TabPill>
        <TabPill active={activeTab === "slips"} onClick={() => setActiveTab("slips")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          สลิปรอยืนยัน
          {stats.pendingSlips > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              minWidth: 20, height: 20, padding: "0 6px",
              background: activeTab === "slips" ? "rgba(255,255,255,0.35)" : "var(--color-error)",
              color: "white", fontSize: 11, fontWeight: 700, borderRadius: 9999, lineHeight: 1,
            }}>
              {stats.pendingSlips}
            </span>
          )}
        </TabPill>
      </div>

      {/* Tab: Tenants */}
      {activeTab === "tenants" && (
        <div role="tabpanel" aria-label="รายชื่อผู้เช่า">
          {/* Search bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "20px 24px",
            background: "white", border: "1px solid var(--color-border)", borderRadius: "var(--border-radius)",
            boxShadow: "var(--shadow-sm)", marginBottom: 20,
          }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label style={{ fontSize: "0.8rem", marginBottom: 4, display: "block" }}>ค้นหา</label>
              <input
                type="text"
                placeholder="ชื่อ, อีเมล, หรือเบอร์ห้อง…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="table-container">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 600 }}>รายชื่อผู้เช่า</span>
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{filteredTenants.length} คน</span>
            </div>
            {filteredTenants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👤</div>
                <p className="empty-state-text">{search ? "ไม่พบผู้เช่าที่ค้นหา" : "ยังไม่มีผู้เช่า"}</p>
                {!search && (
                  <button className="btn btn-primary" onClick={openAddModal}>เพิ่มผู้เช่า</button>
                )}
              </div>
            ) : (
              <table aria-label="ตารางผู้เช่า">
                <thead>
                  <tr>
                    <th>ชื่อผู้เช่า</th>
                    <th>ห้อง</th>
                    <th>หอพัก</th>
                    <th>สถานะบิล</th>
                    <th style={{ textAlign: "right" }}>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((t) => {
                    const color = avatarColor(t.id);
                    return (
                      <tr key={t.id}>
                        <td data-label="ชื่อ">
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: "50%",
                              background: color.bg, color: color.text,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, letterSpacing: "0.02em",
                            }}>
                              {initials(t.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.8125rem", lineHeight: 1.25 }}>{t.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 2 }}>{t.email}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="ห้อง">
                          {t.room ? (
                            <strong style={{ fontSize: "1rem" }}>{t.room.roomNumber}</strong>
                          ) : (
                            <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>—</span>
                          )}
                        </td>
                        <td data-label="หอพัก">
                          {t.room?.location.name ?? (
                            <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>ยังไม่ผูกห้อง</span>
                          )}
                        </td>
                        <td data-label="สถานะบิล">
                          {t.latestBillStatus === "PAID" ? (
                            <span className="badge badge-success">จ่ายแล้ว</span>
                          ) : t.latestBillStatus === "UNPAID" ? (
                            <span className="badge badge-warning">ค้างชำระ</span>
                          ) : t.latestBillStatus === "PENDING" ? (
                            <span className="badge badge-info">รอยืนยัน</span>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>ไม่มีบิล</span>
                          )}
                        </td>
                        <td data-label="การจัดการ" style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => regeneratePin(t.id, t.name, t.email)}
                              aria-label={`สร้าง/ดู PIN ของ ${t.name}`}
                            >
                              PIN
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => openEditModal(t)}
                              aria-label={`แก้ไข ${t.name}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setDeleteModal({ open: true, tenant: t })}
                              aria-label={`ลบ ${t.name}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Slips */}
      {activeTab === "slips" && (
        <div role="tabpanel" aria-label="สลิปรอยืนยัน">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
              สลิปรอยืนยัน {slips.length > 0 && `(${slips.length})`}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={loadSlips} disabled={slipsLoading}>
              {slipsLoading ? "โหลด..." : "รีเฟรช"}
            </button>
          </div>

          {slipsLoading ? (
            <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-secondary)" }}>กำลังโหลด...</div>
          ) : slips.length === 0 ? (
            <div style={{ background: "white", border: "1px solid var(--color-border)", borderRadius: "var(--border-radius)", padding: 48, textAlign: "center", color: "var(--color-text-secondary)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#059669" strokeWidth="1.5" style={{ margin: "0 auto" }}>
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p style={{ fontWeight: 600, color: "#059669" }}>ไม่มีสลิปรอยืนยัน</p>
            </div>
          ) : (
            <div className="table-container">
              <table aria-label="ตารางสลิปรอยืนยัน">
                <thead>
                  <tr>
                    <th>ผู้เช่า</th>
                    <th>ห้อง</th>
                    <th>หอพัก</th>
                    <th>เดือน</th>
                    <th>ยอด (บาท)</th>
                    <th>ส่งเมื่อ</th>
                    <th style={{ textAlign: "right" }}>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {slips.map((slip) => (
                    <tr key={slip.id}>
                      <td data-label="ผู้เช่า">
                        <div style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{slip.room.tenant?.name ?? "—"}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{slip.room.tenant?.email}</div>
                      </td>
                      <td data-label="ห้อง"><strong>{slip.room.roomNumber}</strong></td>
                      <td data-label="หอพัก">{slip.room.location.name}</td>
                      <td data-label="เดือน">{thaiPeriod(slip.period)}</td>
                      <td data-label="ยอด">
                        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{fmt(slip.total)}</span>
                      </td>
                      <td data-label="ส่งเมื่อ" style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                        {slip.paymentSubmittedAt
                          ? new Date(slip.paymentSubmittedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
                          : "—"}
                      </td>
                      <td data-label="การจัดการ" style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setSlipPreview(slip)}
                          >
                            ดูสลิป
                          </button>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => approveSlip(slip)}
                            disabled={slipActionLoading}
                          >
                            อนุมัติ
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => { setRejectModal({ open: true, slip }); setRejectReason(""); }}
                            disabled={slipActionLoading}
                            style={{ background: "var(--color-error)", color: "white", borderColor: "var(--color-error)" }}
                          >
                            ปฏิเสธ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL: Add/Edit Tenant ══ */}
      {tenantModal.open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setTenantModal({ ...tenantModal, open: false })}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{tenantModal.mode === "add" ? "เพิ่มผู้เช่าใหม่" : "แก้ไขข้อมูลผู้เช่า"}</h2>
              <button className="modal-close" aria-label="ปิด" onClick={() => setTenantModal({ ...tenantModal, open: false })}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form">
                <div className="form-group">
                  <label className="form-group">
                    ชื่อ-นามสกุล <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ชื่อจริง นามสกุล"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>อีเมล (ใช้ Login) <span style={{ color: "var(--color-error)" }}>*</span></label>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    placeholder="08x-xxx-xxxx"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    autoComplete="tel"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>ห้องพัก</label>
                    <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                      <option value="">ยังไม่ผูกห้อง</option>
                      {availableRooms(tenantModal.tenant?.id).map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          {r.location.name} — ห้อง {r.roomNumber}
                          {r.roomType ? ` (${r.roomType})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>เงินมัดจำ (บาท)</label>
                    <input
                      type="number"
                      placeholder="6000"
                      value={form.deposit}
                      onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>วันที่เข้าพัก</label>
                    <input
                      type="date"
                      value={form.moveInDate}
                      onChange={(e) => setForm({ ...form, moveInDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>สถานะ</label>
                    <select value={form.isActive ? "true" : "false"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}>
                      <option value="true">ใช้งาน</option>
                      <option value="false">ปิดการใช้งาน</option>
                    </select>
                  </div>
                </div>

                {tenantModal.mode === "add" && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "var(--color-info-bg, #F0F9FF)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: "var(--border-radius)", fontSize: "0.875rem", color: "var(--color-info)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>ระบบจะสร้าง PIN 6 หลักอัตโนมัติ — PIN จะแสดงให้เห็นครั้งเดียวหลังบันทึก</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTenantModal({ ...tenantModal, open: false })}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={saveTenant} disabled={formLoading}>
                {formLoading ? "กำลังบันทึก..." : tenantModal.mode === "add" ? "บันทึก + สร้าง PIN" : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: PIN display ══ */}
      {pinModal?.open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setPinModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">PIN ผู้เช่า</h2>
              <button className="modal-close" aria-label="ปิด" onClick={() => setPinModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: 16 }}>
                PIN ของ <strong>{pinModal.tenantName}</strong>
              </p>

              {/* PIN digit boxes */}
              <div
                role="status"
                aria-label={`PIN ${pinModal.pin}`}
                aria-live="polite"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: 24, background: "var(--color-bg-lighter)", border: "1px solid var(--color-border)",
                  borderRadius: "var(--border-radius)", margin: "16px 0",
                }}
              >
                {pinModal.pin.split("").map((digit, i) => (
                  <div
                    key={i}
                    style={{
                      width: 44, height: 52, border: "2px solid var(--color-primary)",
                      borderRadius: "var(--border-radius)", background: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'JetBrains Mono', monospace", fontSize: "1.4rem",
                      fontWeight: 700, color: "var(--color-primary)",
                    }}
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => copyPin(pinModal.pin)}
                  aria-label={`คัดลอก PIN ${pinModal.pin}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  คัดลอก
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => sendPinEmail(pinModal.tenantId, pinModal.pin)}
                  aria-label={`ส่งอีเมล PIN ให้ ${pinModal.tenantName}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  ส่งอีเมล
                </button>
              </div>
              {pinModal.tenantEmail && (
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: 12, textAlign: "center" }}>
                  ส่งไปที่: {pinModal.tenantEmail}
                </p>
              )}

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: 12 }}>
                  PIN นี้จะแสดงเพียงครั้งเดียว — โปรดส่งให้ผู้เช่าทันที
                </p>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%" }}
                  onClick={() => regeneratePin(pinModal.tenantId, pinModal.tenantName, pinModal.tenantEmail)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                  </svg>
                  สร้าง PIN ใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Delete confirm ══ */}
      {deleteModal?.open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-body" style={{ textAlign: "center", padding: 32 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "var(--color-error-bg, #FEF2F2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>ลบผู้เช่า?</h2>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: 24 }}>
                ลบ &ldquo;{deleteModal.tenant.name}&rdquo; ออกจากระบบ? การลบจะยกเลิกการผูกห้องและสิทธิ์การเข้าสู่ระบบทันที ไม่สามารถย้อนกลับได้
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>ยกเลิก</button>
                <button
                  className="btn btn-danger"
                  style={{ background: "var(--color-error)", color: "white", borderColor: "var(--color-error)" }}
                  onClick={deleteTenant}
                >
                  ลบออก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Slip Preview ══ */}
      {slipPreview && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSlipPreview(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">
                สลิปชำระ — ห้อง {slipPreview.room.roomNumber} ({thaiPeriod(slipPreview.period)})
              </h2>
              <button className="modal-close" aria-label="ปิด" onClick={() => setSlipPreview(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div><span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>ผู้เช่า</span>
                  <div style={{ fontWeight: 600 }}>{slipPreview.room.tenant?.name ?? "—"}</div></div>
                <div><span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>ยอดชำระ</span>
                  <div style={{ fontWeight: 700, fontFamily: "monospace" }}>{fmt(slipPreview.total)} บาท</div></div>
                <div><span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>ส่งเมื่อ</span>
                  <div style={{ fontSize: "0.875rem" }}>
                    {slipPreview.paymentSubmittedAt
                      ? new Date(slipPreview.paymentSubmittedAt).toLocaleString("th-TH")
                      : "—"}
                  </div>
                </div>
                {slipPreview.paymentNote && (
                  <div><span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>หมายเหตุ</span>
                    <div style={{ fontSize: "0.875rem" }}>{slipPreview.paymentNote}</div></div>
                )}
              </div>

              {slipPreview.paymentSlipUrl && (
                <div style={{ marginBottom: 16, textAlign: "center" }}>
                  {slipPreview.paymentSlipUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                    <img
                      src={slipPreview.paymentSlipUrl}
                      alt="สลิปชำระเงิน"
                      style={{ maxWidth: "100%", maxHeight: 400, objectFit: "contain", borderRadius: 8, border: "1px solid var(--color-border)" }}
                    />
                  ) : (
                    <a
                      href={slipPreview.paymentSlipUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      เปิดไฟล์สลิป (PDF)
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSlipPreview(null)}>ปิด</button>
              <button
                className="btn btn-danger"
                style={{ background: "var(--color-error)", color: "white", borderColor: "var(--color-error)" }}
                onClick={() => { setRejectModal({ open: true, slip: slipPreview }); setSlipPreview(null); setRejectReason(""); }}
                disabled={slipActionLoading}
              >
                ปฏิเสธ
              </button>
              <button
                className="btn btn-success"
                onClick={() => approveSlip(slipPreview)}
                disabled={slipActionLoading}
              >
                {slipActionLoading ? "กำลังอนุมัติ..." : "อนุมัติ ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Reject Slip ══ */}
      {rejectModal?.open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">ปฏิเสธสลิป</h2>
              <button className="modal-close" aria-label="ปิด" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: 16 }}>
                ระบุเหตุผลการปฏิเสธเพื่อให้ผู้เช่าแก้ไขและส่งสลิปใหม่
              </p>
              <div className="form-group">
                <label>เหตุผล <span style={{ color: "var(--color-error)" }}>*</span></label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="เช่น ภาพสลิปไม่ชัด / ยอดเงินไม่ตรง"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--border-radius)", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>ยกเลิก</button>
              <button
                className="btn btn-danger"
                style={{ background: "var(--color-error)", color: "white", borderColor: "var(--color-error)" }}
                onClick={rejectSlip}
                disabled={slipActionLoading || !rejectReason.trim()}
              >
                {slipActionLoading ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TabPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "8px 16px", borderRadius: 9999,
        fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
        border: `1.5px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
        background: active ? "var(--color-primary)" : "white",
        color: active ? "white" : "var(--color-text-secondary)",
        transition: "all 120ms ease",
      }}
    >
      {children}
    </button>
  );
}
