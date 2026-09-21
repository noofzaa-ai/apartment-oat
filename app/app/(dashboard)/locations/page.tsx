"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Toast from "@/components/Toast";

interface Location {
  id: number;
  name: string;
  address: string | null;
  createdAt: string;
  _count: { rooms: number };
}

interface FormData {
  name: string;
  address: string;
}

interface Subscription {
  active: boolean;
  status: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

// จำนวนวันที่เหลือของ TRIAL (ปัดขึ้น) — คืน null ถ้าไม่ใช่ trial ที่ยังเหลือ
function trialDaysLeft(sub: Subscription | null): number | null {
  if (!sub || sub.status !== "TRIAL" || !sub.trialEndsAt) return null;
  const end = new Date(sub.trialEndsAt).getTime();
  if (Number.isNaN(end)) return null;
  const ms = end - Date.now();
  if (ms <= 0) return null;
  return Math.ceil(ms / 86_400_000);
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Location | null>(null);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [form, setForm] = useState<FormData>({ name: "", address: "" });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ดึงสถานะ subscription ไว้โชว์ชิปวันคงเหลือ (best-effort, ไม่ทำให้หน้าล้ม)
  const loadSubscription = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription");
      if (!res.ok) return;
      const data = (await res.json()) as Subscription;
      setSubscription(data);
    } catch {
      // เงียบไว้ — เป็นเพียงข้อมูลเสริม
    }
  }, []);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (!res.ok) {
        // 403 = ยังไม่มีแพ็กเกจที่ใช้งานอยู่ → แสดงหน้าเริ่มทดลองใช้แทน
        if (res.status === 403) {
          setNeedsSubscription(true);
          setLocations([]);
          setSubscription(null);
        } else {
          setToast({ message: data?.error || "โหลดข้อมูลล้มเหลว", type: "error" });
        }
        return;
      }
      setNeedsSubscription(false);
      setLocations(Array.isArray(data) ? data : []);
      loadSubscription();
    } catch {
      setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [loadSubscription]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const startTrial = async () => {
    setStartingTrial(true);
    try {
      const res = await fetch("/api/subscription", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "เริ่มทดลองใช้งานไม่สำเร็จ");
      setSubscription(data as Subscription);
      setNeedsSubscription(false);
      setToast({ message: "เริ่มทดลองใช้งานแล้ว", type: "success" });
      loadLocations();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setStartingTrial(false);
    }
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", address: "" });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditTarget(loc);
    setForm({ name: loc.name, address: loc.address || "" });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.name.trim()) errs.name = "กรุณากรอกชื่อหอพัก";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = editTarget ? `/api/locations/${editTarget.id}` : "/api/locations";
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        // trial หมดกลางคัน — เด้งกลับหน้าเริ่มทดลองใช้แทนการโชว์ error ดิบ
        if (res.status === 403 && data?.code === "subscription_required") {
          closeModal();
          setNeedsSubscription(true);
          setSubscription(null);
          setToast({ message: "แพ็กเกจของคุณหมดอายุ กรุณาเริ่มใช้งานอีกครั้ง", type: "error" });
          return;
        }
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }
      setToast({ message: editTarget ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มหอพักสำเร็จ", type: "success" });
      closeModal();
      loadLocations();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/locations/${deleteModal.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      setToast({ message: "ลบหอพักสำเร็จ", type: "success" });
      setDeleteModal(null);
      loadLocations();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const daysLeft = trialDaysLeft(subscription);

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "3rem" }}>🏢</span>
            หอพัก
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {!needsSubscription && daysLeft !== null && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 20px",
                  borderRadius: 16,
                  fontSize: "0.875rem",
                  fontWeight: 900,
                  background: "#FFD93D",
                  border: "4px solid #2C3E50",
                  color: "#2C3E50",
                }}
              >
                ⏰ ทดลองใช้ฟรีเหลือ {daysLeft} วัน
              </span>
            )}
            {!needsSubscription && !loading && (
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
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onClick={openAdd}
              >
                + เพิ่มหอพัก
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 64, fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700 }}>
            กำลังโหลด...
          </div>
        ) : needsSubscription ? (
          <div
            style={{
              maxWidth: 520,
              margin: "8px auto 0",
              textAlign: "center",
              padding: "48px 40px",
              background: "#FFFFFF",
              border: "4px solid #2C3E50",
              borderRadius: 24,
            }}
          >
            <div style={{ fontSize: "5rem", marginBottom: 16 }}>✨</div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#2C3E50", marginBottom: 12 }}>
              เริ่มใช้งานฟรี 30 วัน
            </h2>
            <p style={{ color: "#2C3E50", fontSize: "1rem", lineHeight: 1.7, marginBottom: 24, fontWeight: 600 }}>
              เริ่มทดลองใช้งานฟรี 30 วัน เพื่อสร้างและจัดการหอของคุณ — เพิ่มหอพัก จัดการห้อง อ่านมิเตอร์ และออกบิลได้ทันที
            </p>
            <button
              style={{
                padding: "16px 32px",
                borderRadius: 20,
                fontSize: "1.125rem",
                fontWeight: 900,
                background: "#7FDB9A",
                border: "4px solid #2C3E50",
                color: "#2C3E50",
                cursor: startingTrial ? "not-allowed" : "pointer",
                minWidth: 220,
              }}
              onClick={startTrial}
              disabled={startingTrial}
            >
              {startingTrial ? "กำลังเริ่ม..." : "เริ่มทดลองใช้งานฟรี"}
            </button>
          </div>
        ) : locations.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              border: "4px solid #2C3E50",
              borderRadius: 24,
              padding: "64px 40px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "5rem", marginBottom: 16 }}>🏢</div>
            <p style={{ fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700, marginBottom: 24 }}>
              ยังไม่มีหอพัก กดปุ่ม &quot;เพิ่มหอพัก&quot; เพื่อเริ่มต้น
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {locations.map((loc) => (
              <div
                key={loc.id}
                style={{
                  background: "#FFFFFF",
                  border: "4px solid #2C3E50",
                  borderRadius: 24,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "20px 24px",
                    borderBottom: "3px solid #2C3E50",
                    fontSize: "1.25rem",
                    fontWeight: 900,
                    color: "#2C3E50",
                  }}
                >
                  {loc.name}
                </div>
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: "0.875rem", color: "#64748B", fontWeight: 700, marginBottom: 4 }}>
                      ที่อยู่
                    </div>
                    <div style={{ fontSize: "0.9375rem", color: "#2C3E50", fontWeight: 600 }}>
                      {loc.address || "—"}
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: "0.875rem", color: "#64748B", fontWeight: 700, marginBottom: 4 }}>
                      จำนวนห้อง
                    </div>
                    <div style={{ fontSize: "0.9375rem", color: "#2C3E50", fontWeight: 600 }}>
                      {loc._count.rooms} ห้อง
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px 20px",
                    borderTop: "3px solid #2C3E50",
                    background: "#FFF8F0",
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href={`/app/rooms?locationId=${loc.id}`}
                    style={{
                      flex: 1,
                      minWidth: 100,
                      padding: "12px 20px",
                      borderRadius: 16,
                      fontSize: "0.9375rem",
                      fontWeight: 900,
                      background: "#B8D8E8",
                      border: "3px solid #2C3E50",
                      color: "#2C3E50",
                      textAlign: "center",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    ดูห้อง →
                  </Link>
                  <button
                    style={{
                      padding: "12px 16px",
                      borderRadius: 16,
                      fontSize: "0.9375rem",
                      fontWeight: 900,
                      background: "#FFFFFF",
                      border: "3px solid #2C3E50",
                      color: "#2C3E50",
                      cursor: "pointer",
                    }}
                    onClick={() => openEdit(loc)}
                  >
                    แก้ไข
                  </button>
                  <button
                    style={{
                      padding: "12px 16px",
                      borderRadius: 16,
                      fontSize: "0.9375rem",
                      fontWeight: 900,
                      background: "#FFFFFF",
                      border: "3px solid #DC2626",
                      color: "#DC2626",
                      cursor: "pointer",
                    }}
                    onClick={() => setDeleteModal(loc)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "4px solid #2C3E50",
              borderRadius: 24,
              maxWidth: 520,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "3px solid #2C3E50",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50", margin: 0 }}>
                {editTarget ? "แก้ไขหอพัก" : "เพิ่มหอพักใหม่"}
              </h2>
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "3px solid #2C3E50",
                  background: "#FFFFFF",
                  color: "#2C3E50",
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={closeModal}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "1rem",
                    fontWeight: 800,
                    color: "#2C3E50",
                    marginBottom: 8,
                  }}
                >
                  ชื่อหอพัก <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น หอพักสุขใจ"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: `3px solid ${errors.name ? "#DC2626" : "#2C3E50"}`,
                    borderRadius: 16,
                    fontSize: "1rem",
                    color: "#2C3E50",
                    fontWeight: 600,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {errors.name && (
                  <span style={{ display: "block", marginTop: 6, fontSize: "0.875rem", color: "#DC2626", fontWeight: 700 }}>
                    {errors.name}
                  </span>
                )}
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "1rem",
                    fontWeight: 800,
                    color: "#2C3E50",
                    marginBottom: 8,
                  }}
                >
                  ที่อยู่
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="เช่น 123 ถนนสุขุมวิท กรุงเทพฯ"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "3px solid #2C3E50",
                    borderRadius: 16,
                    fontSize: "1rem",
                    color: "#2C3E50",
                    fontWeight: 600,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                padding: "16px 20px",
                borderTop: "3px solid #2C3E50",
                background: "#FFF8F0",
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
              }}
            >
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: 16,
                  fontSize: "1rem",
                  fontWeight: 900,
                  background: "#FFFFFF",
                  border: "3px solid #2C3E50",
                  color: "#2C3E50",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
                onClick={closeModal}
                disabled={saving}
              >
                ยกเลิก
              </button>
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: 16,
                  fontSize: "1rem",
                  fontWeight: 900,
                  background: "#7FDB9A",
                  border: "3px solid #2C3E50",
                  color: "#2C3E50",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setDeleteModal(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "4px solid #2C3E50",
              borderRadius: 24,
              maxWidth: 440,
              width: "100%",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "3px solid #2C3E50",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50", margin: 0 }}>
                ยืนยันการลบ
              </h2>
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "3px solid #2C3E50",
                  background: "#FFFFFF",
                  color: "#2C3E50",
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => setDeleteModal(null)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "32px 28px", textAlign: "center" }}>
              <div style={{ fontSize: "4rem", marginBottom: 16 }}>⚠️</div>
              <p style={{ fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700, lineHeight: 1.6 }}>
                คุณต้องการลบหอพัก <strong>{deleteModal.name}</strong> ใช่หรือไม่?
                <br />
                การลบจะลบห้องทั้งหมดในหอพักนี้ด้วย
              </p>
            </div>
            <div
              style={{
                padding: "16px 20px",
                borderTop: "3px solid #2C3E50",
                background: "#FFF8F0",
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
              }}
            >
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: 16,
                  fontSize: "1rem",
                  fontWeight: 900,
                  background: "#FFFFFF",
                  border: "3px solid #2C3E50",
                  color: "#2C3E50",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
                onClick={() => setDeleteModal(null)}
                disabled={saving}
              >
                ยกเลิก
              </button>
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: 16,
                  fontSize: "1rem",
                  fontWeight: 900,
                  background: "#FFFFFF",
                  border: "3px solid #DC2626",
                  color: "#DC2626",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? "กำลังลบ..." : "ลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
