"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";

interface Location {
  id: number;
  name: string;
}

interface RoomOption {
  id?: number;
  name: string;
  price: number;
}

interface Room {
  id: number;
  locationId: number;
  roomNumber: string;
  roomType: string | null;
  baseRent: number;
  waterRate: number;
  electricRate: number;
  options: RoomOption[];
  location: { name: string };
}

interface RoomForm {
  roomNumber: string;
  roomType: string;
  baseRent: string;
  waterRate: string;
  electricRate: string;
  options: RoomOption[];
}

interface RoomPreset {
  id: number;
  name: string;
  roomType: string | null;
  baseRent: number;
  waterRate: number;
  electricRate: number;
  options: RoomOption[];
}

const ROOM_TYPES = ["ห้องเดี่ยว", "ห้องคู่", "ห้องสตูดิโอ", "ห้อง 1 ห้องนอน", "ห้อง 2 ห้องนอน", "อื่นๆ"];

function fmt(n: number) {
  return n.toLocaleString("th-TH");
}

function RoomsContent() {
  const searchParams = useSearchParams();
  const locationIdParam = searchParams.get("locationId");

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locationIdParam || "");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [presets, setPresets] = useState<RoomPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Room | null>(null);
  const [deleteModal, setDeleteModal] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomForm>({
    roomNumber: "",
    roomType: "",
    baseRent: "",
    waterRate: "",
    electricRate: "",
    options: [],
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [errors, setErrors] = useState<Partial<RoomForm>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data: Location[]) => {
        setLocations(data);
        if (!selectedLocationId && data.length > 0) {
          setSelectedLocationId(String(data[0].id));
        }
      });
  }, [selectedLocationId]);

  const loadRooms = useCallback(async () => {
    if (!selectedLocationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms?locationId=${selectedLocationId}`);
      const data = await res.json();
      setRooms(data);
    } catch {
      setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId]);

  const loadPresets = useCallback(async () => {
    if (!selectedLocationId) return;
    try {
      const res = await fetch(`/api/admin/room-presets?apartmentId=${selectedLocationId}`);
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch {
      // Silent fail - presets are optional
    }
  }, [selectedLocationId]);

  useEffect(() => {
    loadRooms();
    loadPresets();
  }, [loadRooms, loadPresets]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ roomNumber: "", roomType: "", baseRent: "", waterRate: "18", electricRate: "7", options: [] });
    setSelectedPresetId("");
    setErrors({});
    setModalOpen(true);
  };

  const applyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = presets.find((p) => String(p.id) === presetId);
    if (!preset) return;
    setForm({
      ...form,
      roomType: preset.roomType || "",
      baseRent: String(preset.baseRent),
      waterRate: String(preset.waterRate),
      electricRate: String(preset.electricRate),
      options: preset.options.map((o) => ({ name: o.name, price: o.price })),
    });
  };

  const openEdit = (room: Room) => {
    setEditTarget(room);
    setForm({
      roomNumber: room.roomNumber,
      roomType: room.roomType || "",
      baseRent: String(room.baseRent),
      waterRate: String(room.waterRate),
      electricRate: String(room.electricRate),
      options: room.options.map((o) => ({ name: o.name, price: o.price })),
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Partial<RoomForm> = {};
    if (!form.roomNumber.trim()) errs.roomNumber = "กรุณากรอกเลขห้อง";
    if (!form.baseRent || Number(form.baseRent) <= 0) errs.baseRent = "กรุณากรอกค่าเช่า";
    if (!form.waterRate || Number(form.waterRate) < 0) errs.waterRate = "กรุณากรอกเรทน้ำ";
    if (!form.electricRate || Number(form.electricRate) < 0) errs.electricRate = "กรุณากรอกเรทไฟ";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = editTarget ? `/api/rooms/${editTarget.id}` : "/api/rooms";
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: Number(selectedLocationId),
          roomNumber: form.roomNumber,
          roomType: form.roomType,
          baseRent: Number(form.baseRent),
          waterRate: Number(form.waterRate),
          electricRate: Number(form.electricRate),
          options: form.options.filter((o) => o.name.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
      setToast({ message: editTarget ? "แก้ไขห้องสำเร็จ" : "เพิ่มห้องสำเร็จ", type: "success" });
      setModalOpen(false);
      loadRooms();
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
      const res = await fetch(`/api/rooms/${deleteModal.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      setToast({ message: "ลบห้องสำเร็จ", type: "success" });
      setDeleteModal(null);
      loadRooms();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    setForm({ ...form, options: [...form.options, { name: "", price: 0 }] });
  };

  const updateOption = (idx: number, field: "name" | "price", value: string) => {
    const opts = [...form.options];
    opts[idx] = { ...opts[idx], [field]: field === "price" ? Number(value) : value };
    setForm({ ...form, options: opts });
  };

  const removeOption = (idx: number) => {
    setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  };

  const selectedLocation = locations.find((l) => String(l.id) === selectedLocationId);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: "0.875rem", color: "#2C3E50", fontWeight: 600 }}>
            <Link href="/app/(dashboard)/locations" style={{ color: "#2C3E50", textDecoration: "none" }}>🏢 หอพัก</Link>
            <span>›</span>
            <span>{selectedLocation?.name || "ห้อง"}</span>
          </div>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "3rem" }}>🚪</span>
            ห้อง
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              fontSize: "0.95rem",
              fontWeight: 700,
              background: "#FFFFFF",
              border: "4px solid #2C3E50",
              color: "#2C3E50",
              minWidth: 160,
              cursor: "pointer",
            }}
          >
            <option value="">-- เลือกหอพัก --</option>
            {locations.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.name}
              </option>
            ))}
          </select>
          {selectedLocationId && (
            <>
              <Link
                href={`/app/apartments/${selectedLocationId}/presets`}
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  background: "#B8D8E8",
                  border: "4px solid #2C3E50",
                  color: "#2C3E50",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ⚙️ Preset
              </Link>
              <Link
                href={`/app/apartments/${selectedLocationId}/rooms/bulk`}
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  background: "#B8D8E8",
                  border: "4px solid #2C3E50",
                  color: "#2C3E50",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                📋 สร้างหลายห้อง
              </Link>
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  background: "#7FDB9A",
                  border: "4px solid #2C3E50",
                  color: "#2C3E50",
                  cursor: "pointer",
                }}
                onClick={openAdd}
              >
                + เพิ่มห้อง
              </button>
            </>
          )}
        </div>
      </div>

      {!selectedLocationId ? (
        <div style={{ background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 24, padding: "64px 40px", textAlign: "center" }}>
          <div style={{ fontSize: "5rem", marginBottom: 16 }}>🏠</div>
          <p style={{ fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700, marginBottom: 24 }}>
            กรุณาเลือกหอพักก่อน
          </p>
          <Link
            href="/app/(dashboard)/locations"
            style={{
              padding: "14px 28px",
              borderRadius: 16,
              fontSize: "1rem",
              fontWeight: 900,
              background: "#7FDB9A",
              border: "4px solid #2C3E50",
              color: "#2C3E50",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ไปที่หน้าหอพัก
          </Link>
        </div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: 64, fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700 }}>
          กำลังโหลด...
        </div>
      ) : rooms.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 24, padding: "64px 40px", textAlign: "center" }}>
          <div style={{ fontSize: "5rem", marginBottom: 16 }}>🚪</div>
          <p style={{ fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700, marginBottom: 24 }}>
            ยังไม่มีห้องในหอพักนี้
          </p>
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
            onClick={openAdd}
          >
            เพิ่มห้องแรก
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ห้อง</th>
                <th>ประเภท</th>
                <th>ค่าเช่า (บาท)</th>
                <th>เรทน้ำ/หน่วย</th>
                <th>เรทไฟ/หน่วย</th>
                <th>ตัวเลือกเสริม</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td><strong>{room.roomNumber}</strong></td>
                  <td>{room.roomType || "—"}</td>
                  <td>{fmt(room.baseRent)}</td>
                  <td>{fmt(room.waterRate)}</td>
                  <td>{fmt(room.electricRate)}</td>
                  <td>
                    <div className="options-tags">
                      {room.options.length === 0 ? (
                        <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>—</span>
                      ) : (
                        room.options.map((opt) => (
                          <span key={opt.id} className="option-tag">
                            {opt.name} {fmt(opt.price)}฿
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          background: "#B8D8E8",
                          border: "3px solid #2C3E50",
                          color: "#2C3E50",
                          cursor: "pointer",
                        }}
                        onClick={() => openEdit(room)}
                      >
                        แก้ไข
                      </button>
                      <button
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          background: "#FFD93D",
                          border: "3px solid #2C3E50",
                          color: "#2C3E50",
                          cursor: "pointer",
                        }}
                        onClick={() => setDeleteModal(room)}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Room Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal modal-lg" style={{ maxHeight: "85vh" }}>
            <div className="modal-header">
              <h2 className="modal-title">{editTarget ? `แก้ไขห้อง ${editTarget.roomNumber}` : "เพิ่มห้องใหม่"}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form">
                {!editTarget && presets.length > 0 && (
                  <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
                    <label>เลือกจาก Preset (ไม่บังคับ)</label>
                    <select
                      value={selectedPresetId}
                      onChange={(e) => applyPreset(e.target.value)}
                    >
                      <option value="">-- ไม่ใช้ preset --</option>
                      {presets.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name} ({p.baseRent.toLocaleString("th-TH")}฿)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label>เลขห้อง <span className="required">*</span></label>
                    <input
                      type="text"
                      value={form.roomNumber}
                      onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                      placeholder="เช่น 101"
                      disabled={!!editTarget}
                      className={errors.roomNumber ? "form-error" : ""}
                    />
                    {errors.roomNumber && <span className="form-error-message">{errors.roomNumber}</span>}
                  </div>
                  <div className="form-group">
                    <label>ประเภทห้อง</label>
                    <select
                      value={form.roomType}
                      onChange={(e) => setForm({ ...form, roomType: e.target.value })}
                    >
                      <option value="">-- เลือกประเภท --</option>
                      {ROOM_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>ค่าเช่า (บาท/เดือน) <span className="required">*</span></label>
                    <input
                      type="number"
                      value={form.baseRent}
                      onChange={(e) => setForm({ ...form, baseRent: e.target.value })}
                      placeholder="เช่น 3000"
                      min="0"
                      className={errors.baseRent ? "form-error" : ""}
                    />
                    {errors.baseRent && <span className="form-error-message">{errors.baseRent}</span>}
                  </div>
                  <div className="form-group">
                    {/* spacer */}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>เรทค่าน้ำ (บาท/หน่วย) <span className="required">*</span></label>
                    <input
                      type="number"
                      value={form.waterRate}
                      onChange={(e) => setForm({ ...form, waterRate: e.target.value })}
                      placeholder="เช่น 18"
                      min="0"
                      step="0.5"
                      className={errors.waterRate ? "form-error" : ""}
                    />
                    {errors.waterRate && <span className="form-error-message">{errors.waterRate}</span>}
                  </div>
                  <div className="form-group">
                    <label>เรทค่าไฟ (บาท/หน่วย) <span className="required">*</span></label>
                    <input
                      type="number"
                      value={form.electricRate}
                      onChange={(e) => setForm({ ...form, electricRate: e.target.value })}
                      placeholder="เช่น 7"
                      min="0"
                      step="0.5"
                      className={errors.electricRate ? "form-error" : ""}
                    />
                    {errors.electricRate && <span className="form-error-message">{errors.electricRate}</span>}
                  </div>
                </div>

                <div>
                  <div className="section-title" style={{ marginBottom: "var(--space-sm)" }}>
                    ตัวเลือกเสริม (Options)
                  </div>
                  <div className="options-list">
                    {form.options.map((opt, idx) => (
                      <div key={idx} className="option-row">
                        <input
                          type="text"
                          value={opt.name}
                          onChange={(e) => updateOption(idx, "name", e.target.value)}
                          placeholder="ชื่อ เช่น ที่จอดรถ"
                          style={{ flex: 2 }}
                        />
                        <input
                          type="number"
                          value={opt.price}
                          onChange={(e) => updateOption(idx, "price", e.target.value)}
                          placeholder="ราคา"
                          min="0"
                          style={{ flex: 1, minWidth: 90 }}
                        />
                        <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>บาท</span>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeOption(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={addOption}
                      style={{ alignSelf: "flex-start" }}
                    >
                      + เพิ่มตัวเลือก
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  background: "#FFFFFF",
                  border: "4px solid #2C3E50",
                  color: "#2C3E50",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                ยกเลิก
              </button>
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  background: saving ? "#CBD5E1" : "#7FDB9A",
                  border: "4px solid #2C3E50",
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

      {/* Delete Confirm */}
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
                  คุณต้องการลบห้อง <strong>{deleteModal.roomNumber}</strong> ใช่หรือไม่?
                  <br />
                  ข้อมูลมิเตอร์และบิลของห้องนี้จะถูกลบด้วย
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  background: "#FFFFFF",
                  border: "4px solid #2C3E50",
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
                  borderRadius: 12,
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  background: saving ? "#CBD5E1" : "#FFD93D",
                  border: "4px solid #2C3E50",
                  color: "#2C3E50",
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

export default function RoomsPage() {
  return (
    <Suspense fallback={<div className="loading">กำลังโหลด...</div>}>
      <RoomsContent />
    </Suspense>
  );
}
