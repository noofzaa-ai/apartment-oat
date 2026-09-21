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

      <div className="page-header">
        <h1 className="page-title">หอพัก</h1>
        <div className="page-actions">
          {!needsSubscription && daysLeft !== null && (
            <span
              className="badge badge-warning"
              title={`ทดลองใช้ฟรีเหลือ ${daysLeft} วัน`}
              style={{ fontSize: "0.8rem" }}
            >
              ทดลองใช้ฟรีเหลือ {daysLeft} วัน
            </span>
          )}
          {!needsSubscription && !loading && (
            <button className="btn btn-primary" onClick={openAdd}>
              + เพิ่มหอพัก
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">กำลังโหลด...</div>
      ) : needsSubscription ? (
        <div
          className="card"
          style={{
            maxWidth: 520,
            margin: "8px auto 0",
            textAlign: "center",
            padding: "40px 32px 36px",
            background: "var(--brand-cream)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/oatty-rooms.png"
            width={140}
            height={140}
            alt=""
            aria-hidden="true"
            style={{ margin: "0 auto 16px", filter: "drop-shadow(0 10px 16px rgba(140,94,39,0.16))" }}
          />
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--brand-ink)", marginBottom: 8, letterSpacing: "-0.02em" }}>
            เริ่มใช้งานฟรี 30 วัน
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 380, margin: "0 auto 24px" }}>
            เริ่มทดลองใช้งานฟรี 30 วัน เพื่อสร้างและจัดการหอของคุณ — เพิ่มหอพัก จัดการห้อง อ่านมิเตอร์ และออกบิลได้ทันที
          </p>
          <button
            className="btn btn-primary"
            onClick={startTrial}
            disabled={startingTrial}
            style={{ minWidth: 220 }}
          >
            {startingTrial ? "กำลังเริ่ม..." : "เริ่มทดลองใช้งานฟรี"}
          </button>
        </div>
      ) : locations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏢</div>
          <p className="empty-state-text">ยังไม่มีหอพัก กดปุ่ม &quot;เพิ่มหอพัก&quot; เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="card-grid">
          {locations.map((loc) => (
            <div key={loc.id} className="card">
              <div className="card-header">{loc.name}</div>
              <div className="card-content">
                <div className="card-item">
                  <span className="card-label">ที่อยู่</span>
                  <span className="card-value" style={{ textAlign: "right", fontSize: "0.85rem" }}>
                    {loc.address || "—"}
                  </span>
                </div>
                <div className="card-item">
                  <span className="card-label">จำนวนห้อง</span>
                  <span className="card-value">{loc._count.rooms} ห้อง</span>
                </div>
              </div>
              <div className="card-actions">
                <Link
                  href={`/app/rooms?locationId=${loc.id}`}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  ดูห้อง →
                </Link>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(loc)}>
                  แก้ไข
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteModal(loc)}>
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editTarget ? "แก้ไขหอพัก" : "เพิ่มหอพักใหม่"}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form">
                <div className="form-group">
                  <label htmlFor="name">
                    ชื่อหอพัก <span className="required">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="เช่น หอพักสุขใจ"
                    className={errors.name ? "form-error" : ""}
                  />
                  {errors.name && <span className="form-error-message">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="address">ที่อยู่</label>
                  <input
                    id="address"
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="เช่น 123 ถนนสุขุมวิท กรุงเทพฯ"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                ยกเลิก
              </button>
              <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">ยืนยันการลบ</h2>
              <button className="modal-close" onClick={() => setDeleteModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="confirm-content">
                <div className="confirm-icon">⚠️</div>
                <p className="confirm-text">
                  คุณต้องการลบหอพัก <strong>{deleteModal.name}</strong> ใช่หรือไม่?
                  <br />
                  การลบจะลบห้องทั้งหมดในหอพักนี้ด้วย
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteModal(null)} disabled={saving}>
                ยกเลิก
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? "กำลังลบ..." : "ลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
