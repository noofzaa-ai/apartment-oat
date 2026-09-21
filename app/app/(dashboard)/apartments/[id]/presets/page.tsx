"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { use } from "react";
import Link from "next/link";
import Toast from "@/components/Toast";
import { FeatureUpgradeCTA } from "@/components/QuotaWarning";

interface Apartment {
  id: number;
  name: string;
}

interface PresetOption {
  id?: number;
  name: string;
  price: number;
}

interface RoomPreset {
  id: number;
  apartmentId: number;
  name: string;
  roomType: string | null;
  baseRent: number;
  waterRate: number;
  electricRate: number;
  options: PresetOption[];
}

interface PresetForm {
  name: string;
  roomType: string;
  baseRent: string;
  waterRate: string;
  electricRate: string;
  options: PresetOption[];
}

const ROOM_TYPES = ["ห้องเดี่ยว", "ห้องคู่", "ห้องสตูดิโอ", "ห้อง 1 ห้องนอน", "ห้อง 2 ห้องนอน", "อื่นๆ"];

function fmt(n: number) {
  return n.toLocaleString("th-TH");
}

function PresetsContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const apartmentId = Number(id);

  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [presets, setPresets] = useState<RoomPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoomPreset | null>(null);
  const [deleteModal, setDeleteModal] = useState<RoomPreset | null>(null);
  const [form, setForm] = useState<PresetForm>({
    name: "",
    roomType: "",
    baseRent: "",
    waterRate: "18",
    electricRate: "7",
    options: [],
  });
  const [errors, setErrors] = useState<Partial<PresetForm>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch(`/api/locations/${apartmentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setApartment(data))
      .catch(() => {});
  }, [apartmentId]);

  const loadPresets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/room-presets?apartmentId=${apartmentId}`);
      const data = await res.json();
      if (res.ok) {
        setPresets(data);
        setHasFeature(true);
      } else if (res.status === 403 && data.error === "feature_not_available") {
        setHasFeature(false);
        setPresets([]);
      } else {
        setToast({ message: data.error || "โหลดข้อมูลล้มเหลว", type: "error" });
      }
    } catch {
      setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [apartmentId]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", roomType: "", baseRent: "", waterRate: "18", electricRate: "7", options: [] });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (preset: RoomPreset) => {
    setEditTarget(preset);
    setForm({
      name: preset.name,
      roomType: preset.roomType || "",
      baseRent: String(preset.baseRent),
      waterRate: String(preset.waterRate),
      electricRate: String(preset.electricRate),
      options: preset.options.map((o) => ({ name: o.name, price: o.price })),
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Partial<PresetForm> = {};
    if (!form.name.trim()) errs.name = "กรุณากรอกชื่อ preset";
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
      const url = editTarget ? `/api/admin/room-presets/${editTarget.id}` : "/api/admin/room-presets";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apartmentId,
          name: form.name,
          roomType: form.roomType,
          baseRent: Number(form.baseRent),
          waterRate: Number(form.waterRate),
          electricRate: Number(form.electricRate),
          options: form.options.filter((o) => o.name.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
      setToast({ message: editTarget ? "แก้ไข preset สำเร็จ" : "สร้าง preset สำเร็จ", type: "success" });
      setModalOpen(false);
      loadPresets();
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
      const res = await fetch(`/api/admin/room-presets/${deleteModal.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      setToast({ message: "ลบ preset สำเร็จ", type: "success" });
      setDeleteModal(null);
      loadPresets();
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

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: "0.9375rem", fontWeight: 600, color: "#64748B" }}>
            <Link href="/app/locations" style={{ color: "#64748B", textDecoration: "none" }}>หอพัก</Link>
            <span>›</span>
            <span>{apartment?.name || "..."}</span>
            <span>›</span>
            <span style={{ color: "#2C3E50", fontWeight: 700 }}>Preset ห้อง</span>
          </div>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "3rem" }}>📋</span>
            Preset ห้อง
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
            + สร้าง Preset
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64, fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700 }}>
          กำลังโหลด...
        </div>
      ) : hasFeature === false ? (
        <FeatureUpgradeCTA
          feature="room_preset"
          featureName="Room Preset"
          requiredPlan="STANDARD"
          requiredPlanName="Standard"
        />
      ) : presets.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 64,
            background: "#FFFFFF",
            border: "4px solid #2C3E50",
            borderRadius: 24,
          }}
        >
          <div style={{ fontSize: "5rem", marginBottom: 16 }}>📋</div>
          <p style={{ fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700, marginBottom: 24 }}>ยังไม่มี preset ห้อง</p>
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
            สร้าง Preset แรก
          </button>
        </div>
      ) : (
        <div style={{ overflowX: "auto", background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>ชื่อ Preset</th>
                <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>ประเภทห้อง</th>
                <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>ค่าเช่า (บาท)</th>
                <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>เรทน้ำ/หน่วย</th>
                <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>เรทไฟ/หน่วย</th>
                <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>ตัวเลือกเสริม</th>
                <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {presets.map((preset) => (
                <tr key={preset.id}>
                  <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB" }}>
                    <strong style={{ fontWeight: 900, color: "#2C3E50" }}>{preset.name}</strong>
                  </td>
                  <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB", color: "#2C3E50", fontWeight: 600 }}>{preset.roomType || "—"}</td>
                  <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB", color: "#2C3E50", fontWeight: 700 }}>{fmt(preset.baseRent)}</td>
                  <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB", color: "#2C3E50", fontWeight: 700 }}>{fmt(preset.waterRate)}</td>
                  <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB", color: "#2C3E50", fontWeight: 700 }}>{fmt(preset.electricRate)}</td>
                  <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {preset.options.length === 0 ? (
                        <span style={{ color: "#64748B", fontSize: "0.875rem", fontWeight: 600 }}>—</span>
                      ) : (
                        preset.options.map((opt, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: "inline-block",
                              padding: "4px 12px",
                              fontSize: "0.8125rem",
                              fontWeight: 700,
                              background: "#FFD93D",
                              color: "#2C3E50",
                              borderRadius: 12,
                              border: "2px solid #2C3E50",
                            }}
                          >
                            {opt.name} {fmt(opt.price)}฿
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={{
                          padding: "8px 16px",
                          borderRadius: 12,
                          fontSize: "0.875rem",
                          fontWeight: 900,
                          background: "#FFFFFF",
                          border: "3px solid #2C3E50",
                          color: "#2C3E50",
                          cursor: "pointer",
                        }}
                        onClick={() => openEdit(preset)}
                      >
                        แก้ไข
                      </button>
                      <button
                        style={{
                          padding: "8px 16px",
                          borderRadius: 12,
                          fontSize: "0.875rem",
                          fontWeight: 900,
                          background: "#FFFFFF",
                          border: "3px solid #DC2626",
                          color: "#DC2626",
                          cursor: "pointer",
                        }}
                        onClick={() => setDeleteModal(preset)}
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
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "4px solid #2C3E50",
              borderRadius: 24,
              maxWidth: 640,
              width: "100%",
              maxHeight: "85vh",
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
                {editTarget ? `แก้ไข Preset: ${editTarget.name}` : "สร้าง Preset ใหม่"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
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
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "grid", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>
                      ชื่อ Preset <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="เช่น ห้องแอร์ ชั้น 2"
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
                    {errors.name && <span style={{ display: "block", marginTop: 6, fontSize: "0.875rem", color: "#DC2626", fontWeight: 700 }}>{errors.name}</span>}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>ประเภทห้อง</label>
                    <select
                      value={form.roomType}
                      onChange={(e) => setForm({ ...form, roomType: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        border: "3px solid #2C3E50",
                        borderRadius: 16,
                        fontSize: "1rem",
                        color: "#2C3E50",
                        fontWeight: 600,
                        outline: "none",
                        background: "#FFFFFF",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="">-- เลือกประเภท --</option>
                      {ROOM_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>
                      ค่าเช่า (บาท/เดือน) <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={form.baseRent}
                      onChange={(e) => setForm({ ...form, baseRent: e.target.value })}
                      placeholder="เช่น 3000"
                      min="0"
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        border: `3px solid ${errors.baseRent ? "#DC2626" : "#2C3E50"}`,
                        borderRadius: 16,
                        fontSize: "1rem",
                        color: "#2C3E50",
                        fontWeight: 600,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {errors.baseRent && <span style={{ display: "block", marginTop: 6, fontSize: "0.875rem", color: "#DC2626", fontWeight: 700 }}>{errors.baseRent}</span>}
                  </div>
                  <div></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>
                      เรทค่าน้ำ (บาท/หน่วย) <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={form.waterRate}
                      onChange={(e) => setForm({ ...form, waterRate: e.target.value })}
                      placeholder="เช่น 18"
                      min="0"
                      step="0.5"
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        border: `3px solid ${errors.waterRate ? "#DC2626" : "#2C3E50"}`,
                        borderRadius: 16,
                        fontSize: "1rem",
                        color: "#2C3E50",
                        fontWeight: 600,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {errors.waterRate && <span style={{ display: "block", marginTop: 6, fontSize: "0.875rem", color: "#DC2626", fontWeight: 700 }}>{errors.waterRate}</span>}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>
                      เรทค่าไฟ (บาท/หน่วย) <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={form.electricRate}
                      onChange={(e) => setForm({ ...form, electricRate: e.target.value })}
                      placeholder="เช่น 7"
                      min="0"
                      step="0.5"
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        border: `3px solid ${errors.electricRate ? "#DC2626" : "#2C3E50"}`,
                        borderRadius: 16,
                        fontSize: "1rem",
                        color: "#2C3E50",
                        fontWeight: 600,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {errors.electricRate && <span style={{ display: "block", marginTop: 6, fontSize: "0.875rem", color: "#DC2626", fontWeight: 700 }}>{errors.electricRate}</span>}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "1.125rem", fontWeight: 900, color: "#2C3E50", marginBottom: 12 }}>ตัวเลือกเสริม (Options)</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {form.options.map((opt, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="text"
                          value={opt.name}
                          onChange={(e) => updateOption(idx, "name", e.target.value)}
                          placeholder="ชื่อ เช่น ค่าส่วนกลาง"
                          style={{
                            flex: 2,
                            padding: "12px 16px",
                            border: "3px solid #2C3E50",
                            borderRadius: 12,
                            fontSize: "1rem",
                            color: "#2C3E50",
                            fontWeight: 600,
                            outline: "none",
                          }}
                        />
                        <input
                          type="number"
                          value={opt.price}
                          onChange={(e) => updateOption(idx, "price", e.target.value)}
                          placeholder="ราคา"
                          min="0"
                          style={{
                            flex: 1,
                            minWidth: 90,
                            padding: "12px 16px",
                            border: "3px solid #2C3E50",
                            borderRadius: 12,
                            fontSize: "1rem",
                            color: "#2C3E50",
                            fontWeight: 600,
                            outline: "none",
                          }}
                        />
                        <span style={{ fontSize: "0.875rem", color: "#64748B", fontWeight: 700 }}>บาท</span>
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 12,
                            fontSize: "0.875rem",
                            fontWeight: 900,
                            background: "#FFFFFF",
                            border: "3px solid #DC2626",
                            color: "#DC2626",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOption}
                      style={{
                        padding: "10px 20px",
                        borderRadius: 12,
                        fontSize: "0.875rem",
                        fontWeight: 900,
                        background: "#FFFFFF",
                        border: "3px solid #2C3E50",
                        color: "#2C3E50",
                        cursor: "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      + เพิ่มตัวเลือก
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, padding: "16px 20px", borderTop: "3px solid #2C3E50", background: "#FFF8F0" }}>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: "#FFFFFF",
                  color: "#2C3E50",
                  fontWeight: 900,
                  borderRadius: 16,
                  border: "3px solid #2C3E50",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: "#7FDB9A",
                  color: "#2C3E50",
                  fontWeight: 900,
                  borderRadius: 16,
                  border: "3px solid #2C3E50",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
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
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50", margin: 0 }}>ยืนยันการลบ</h2>
              <button
                onClick={() => setDeleteModal(null)}
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
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "24px 28px", textAlign: "center" }}>
              <div style={{ fontSize: "4rem", marginBottom: 16 }}>⚠️</div>
              <p style={{ color: "#2C3E50", fontWeight: 700, fontSize: "1rem", lineHeight: 1.6, margin: 0 }}>
                คุณต้องการลบ preset <strong>{deleteModal.name}</strong> ใช่หรือไม่?
                <br />
                การลบจะไม่กระทบห้องที่สร้างไว้แล้ว
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, padding: "16px 20px", borderTop: "3px solid #2C3E50", background: "#FFF8F0" }}>
              <button
                onClick={() => setDeleteModal(null)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: "#FFFFFF",
                  color: "#2C3E50",
                  fontWeight: 900,
                  borderRadius: 16,
                  border: "3px solid #2C3E50",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: "#FFFFFF",
                  color: "#DC2626",
                  fontWeight: 900,
                  borderRadius: 16,
                  border: "3px solid #DC2626",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.5 : 1,
                }}
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

export default function PresetsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 64, fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700 }}>กำลังโหลด...</div>}>
      <PresetsContent params={params} />
    </Suspense>
  );
}
