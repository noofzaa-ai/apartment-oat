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

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Location | null>(null);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [form, setForm] = useState<FormData>({ name: "", address: "" });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      setLocations(data);
    } catch {
      setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

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
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
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
          <button className="btn btn-primary" onClick={openAdd}>
            + เพิ่มหอพัก
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">กำลังโหลด...</div>
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
                  href={`/admin/rooms?locationId=${loc.id}`}
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
