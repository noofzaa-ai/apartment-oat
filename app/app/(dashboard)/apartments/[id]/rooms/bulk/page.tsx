"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { use } from "react";
import Link from "next/link";
import Toast from "@/components/Toast";

interface Apartment {
  id: number;
  name: string;
}

interface RoomOption {
  id?: number;
  name: string;
  price: number;
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

interface ManualForm {
  roomType: string;
  baseRent: string;
  waterRate: string;
  electricRate: string;
  options: RoomOption[];
}

interface BulkResult {
  created: { roomNumber: string; roomId: number }[];
  failed: { roomNumber: string; reason: string }[];
}

type Mode = "range" | "list";

const ROOM_TYPES = ["ห้องเดี่ยว", "ห้องคู่", "ห้องสตูดิโอ", "ห้อง 1 ห้องนอน", "ห้อง 2 ห้องนอน", "อื่นๆ"];

function fmt(n: number) {
  return n.toLocaleString("th-TH");
}

function parseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  );
}

function BulkRoomsContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const apartmentId = Number(id);

  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [presets, setPresets] = useState<RoomPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [manual, setManual] = useState<ManualForm>({
    roomType: "",
    baseRent: "",
    waterRate: "18",
    electricRate: "7",
    options: [],
  });
  const [mode, setMode] = useState<Mode>("range");
  const [rangeStart, setRangeStart] = useState("201");
  const [rangeEnd, setRangeEnd] = useState("210");
  const [roomListText, setRoomListText] = useState("201, 202, 205");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [locationsRes, presetsRes] = await Promise.all([
          fetch("/api/locations"),
          fetch(`/api/admin/room-presets?apartmentId=${apartmentId}`),
        ]);

        if (locationsRes.ok) {
          const locations: Apartment[] = await locationsRes.json();
          const found = locations.find((l) => l.id === apartmentId) || null;
          if (active) setApartment(found);
        }

        if (presetsRes.ok) {
          const data = await presetsRes.json();
          if (active) setPresets(data);
        }
      } catch {
        if (active) setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [apartmentId]);

  const selectedPreset = presets.find((p) => String(p.id) === selectedPresetId) || null;

  const roomNumbers = useMemo(() => {
    if (mode === "list") return parseList(roomListText).slice(0, 100);
    const start = Number(rangeStart);
    const end = Number(rangeEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) return [];
    const values: string[] = [];
    for (let n = start; n <= end && values.length < 100; n += 1) {
      values.push(String(n));
    }
    return values;
  }, [mode, rangeStart, rangeEnd, roomListText]);

  const rates = selectedPreset
    ? {
        roomType: selectedPreset.roomType || "",
        baseRent: selectedPreset.baseRent,
        waterRate: selectedPreset.waterRate,
        electricRate: selectedPreset.electricRate,
        options: selectedPreset.options,
      }
    : {
        roomType: manual.roomType,
        baseRent: Number(manual.baseRent || 0),
        waterRate: Number(manual.waterRate || 0),
        electricRate: Number(manual.electricRate || 0),
        options: manual.options,
      };

  const canSubmit =
    roomNumbers.length > 0 &&
    roomNumbers.length <= 100 &&
    (selectedPreset || (Number(manual.baseRent) > 0 && Number(manual.waterRate) >= 0 && Number(manual.electricRate) >= 0));

  const addOption = () => {
    setManual({ ...manual, options: [...manual.options, { name: "", price: 0 }] });
  };

  const updateOption = (idx: number, field: "name" | "price", value: string) => {
    const opts = [...manual.options];
    opts[idx] = { ...opts[idx], [field]: field === "price" ? Number(value) : value };
    setManual({ ...manual, options: opts });
  };

  const removeOption = (idx: number) => {
    setManual({ ...manual, options: manual.options.filter((_, i) => i !== idx) });
  };

  const submit = async () => {
    if (!canSubmit) {
      setToast({ message: "กรุณากรอกข้อมูลให้ครบถ้วน", type: "error" });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { apartmentId };
      if (selectedPreset) {
        body.presetId = selectedPreset.id;
      } else {
        body.roomType = manual.roomType;
        body.baseRent = Number(manual.baseRent);
        body.waterRate = Number(manual.waterRate);
        body.electricRate = Number(manual.electricRate);
        body.options = manual.options.filter((o) => o.name.trim());
      }

      if (mode === "range") {
        body.roomNumberRange = { start: Number(rangeStart), end: Number(rangeEnd) };
      } else {
        body.roomNumbers = roomNumbers;
      }

      const res = await fetch("/api/admin/rooms/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok && !data.created && !data.failed) throw new Error(data.error || "สร้างห้องไม่สำเร็จ");
      setResult(data);
      setToast({
        message: `สร้างสำเร็จ ${data.created.length} ห้อง, ล้มเหลว ${data.failed.length} ห้อง`,
        type: data.created.length > 0 ? "success" : "error",
      });
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const reasonText = (reason: string) => {
    if (reason === "duplicate") return "เลขห้องซ้ำ";
    return reason;
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: "0.9375rem", fontWeight: 600, color: "#64748B" }}>
            <Link href="/app/(dashboard)/locations" style={{ color: "#64748B", textDecoration: "none" }}>หอพัก</Link>
            <span>›</span>
            <Link href={`/app/rooms?locationId=${apartmentId}`} style={{ color: "#64748B", textDecoration: "none" }}>{apartment?.name || "ห้อง"}</Link>
            <span>›</span>
            <span style={{ color: "#2C3E50", fontWeight: 700 }}>สร้างหลายห้อง</span>
          </div>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "3rem" }}>🏗️</span>
            สร้างหลายห้อง
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link
            href={`/app/apartments/${apartmentId}/presets`}
            style={{
              padding: "12px 24px",
              borderRadius: 16,
              fontSize: "1rem",
              fontWeight: 900,
              background: "#FFFFFF",
              border: "4px solid #2C3E50",
              color: "#2C3E50",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            จัดการ Preset
          </Link>
          <Link
            href={`/app/rooms?locationId=${apartmentId}`}
            style={{
              padding: "12px 24px",
              borderRadius: 16,
              fontSize: "1rem",
              fontWeight: 900,
              background: "#FFFFFF",
              border: "4px solid #2C3E50",
              color: "#2C3E50",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            กลับหน้าห้อง
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64, fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700 }}>
          กำลังโหลด...
        </div>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 24, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "3px solid #2C3E50", background: "#FFD93D" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50", margin: 0 }}>ขั้นตอนที่ 1: เลือก Preset</h2>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>เลือกจาก Preset (ไม่บังคับ)</label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
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
                  }}
                >
                  <option value="">-- ไม่ใช้ preset / กรอกค่าเอง --</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={String(preset.id)}>
                      {preset.name} ({fmt(preset.baseRent)}฿)
                    </option>
                  ))}
                </select>
              </div>

              {!selectedPreset && (
                <div style={{ display: "grid", gap: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>ประเภทห้อง</label>
                      <select
                        value={manual.roomType}
                        onChange={(e) => setManual({ ...manual, roomType: e.target.value })}
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
                        }}
                      >
                        <option value="">-- เลือกประเภท --</option>
                        {ROOM_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>
                        ค่าเช่า (บาท/เดือน) <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <input
                        type="number"
                        value={manual.baseRent}
                        onChange={(e) => setManual({ ...manual, baseRent: e.target.value })}
                        placeholder="เช่น 3000"
                        min="0"
                        style={{
                          width: "100%",
                          padding: "14px 16px",
                          border: "3px solid #2C3E50",
                          borderRadius: 16,
                          fontSize: "1rem",
                          color: "#2C3E50",
                          fontWeight: 600,
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>
                        เรทค่าน้ำ (บาท/หน่วย) <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <input
                        type="number"
                        value={manual.waterRate}
                        onChange={(e) => setManual({ ...manual, waterRate: e.target.value })}
                        min="0"
                        step="0.5"
                        style={{
                          width: "100%",
                          padding: "14px 16px",
                          border: "3px solid #2C3E50",
                          borderRadius: 16,
                          fontSize: "1rem",
                          color: "#2C3E50",
                          fontWeight: 600,
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>
                        เรทค่าไฟ (บาท/หน่วย) <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <input
                        type="number"
                        value={manual.electricRate}
                        onChange={(e) => setManual({ ...manual, electricRate: e.target.value })}
                        min="0"
                        step="0.5"
                        style={{
                          width: "100%",
                          padding: "14px 16px",
                          border: "3px solid #2C3E50",
                          borderRadius: 16,
                          fontSize: "1rem",
                          color: "#2C3E50",
                          fontWeight: 600,
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 900, color: "#2C3E50", marginBottom: 12 }}>ตัวเลือกเสริม (Options)</div>
                    <div style={{ display: "grid", gap: 12 }}>
                      {manual.options.map((opt, idx) => (
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
              )}
            </div>
          </div>

          <div style={{ background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 24, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "3px solid #2C3E50", background: "#7FDB9A" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50", margin: 0 }}>ขั้นตอนที่ 2: เลือกวิธีระบุเลขห้อง</h2>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#2C3E50", cursor: "pointer" }}>
                  <input type="radio" checked={mode === "range"} onChange={() => setMode("range")} />
                  ช่วงเลขห้อง
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#2C3E50", cursor: "pointer" }}>
                  <input type="radio" checked={mode === "list"} onChange={() => setMode("list")} />
                  รายการเลขห้อง
                </label>
              </div>

              {mode === "range" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>จากเลขห้อง</label>
                    <input
                      type="number"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      placeholder="201"
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        border: "3px solid #2C3E50",
                        borderRadius: 16,
                        fontSize: "1rem",
                        color: "#2C3E50",
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>ถึงเลขห้อง</label>
                    <input
                      type="number"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      placeholder="210"
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        border: "3px solid #2C3E50",
                        borderRadius: 16,
                        fontSize: "1rem",
                        color: "#2C3E50",
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 8 }}>รายการเลขห้อง</label>
                  <textarea
                    value={roomListText}
                    onChange={(e) => setRoomListText(e.target.value)}
                    placeholder="เช่น 201, 202, 203, 205"
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "3px solid #2C3E50",
                      borderRadius: 16,
                      fontSize: "1rem",
                      color: "#2C3E50",
                      fontWeight: 600,
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>
              )}
              <p style={{ color: "#64748B", fontSize: "0.875rem", marginTop: 12, fontWeight: 600, margin: "12px 0 0 0" }}>
                สร้างได้ไม่เกิน 100 ห้องต่อครั้ง
              </p>
            </div>
          </div>

          <div style={{ background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 24, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "3px solid #2C3E50", background: "#B8D8E8" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50", margin: 0 }}>ขั้นตอนที่ 3: ตรวจสอบและสร้างห้อง</h2>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                <div>
                  <strong style={{ fontWeight: 900, color: "#2C3E50", fontSize: "1.125rem" }}>ตัวอย่างห้องที่จะสร้าง</strong>
                  <p style={{ color: "#64748B", fontSize: "0.875rem", marginTop: 4, fontWeight: 600, margin: "4px 0 0 0" }}>
                    ทั้งหมด {roomNumbers.length} ห้อง {roomNumbers.length >= 100 ? "(แสดง/ส่งสูงสุด 100 ห้อง)" : ""}
                  </p>
                </div>
                <button
                  onClick={submit}
                  disabled={!canSubmit || submitting}
                  style={{
                    padding: "14px 28px",
                    borderRadius: 16,
                    fontSize: "1rem",
                    fontWeight: 900,
                    background: "#7FDB9A",
                    border: "4px solid #2C3E50",
                    color: "#2C3E50",
                    cursor: (!canSubmit || submitting) ? "not-allowed" : "pointer",
                    opacity: (!canSubmit || submitting) ? 0.5 : 1,
                  }}
                >
                  {submitting ? "กำลังสร้าง..." : "สร้างห้อง"}
                </button>
              </div>

              {roomNumbers.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 32,
                    background: "#FFFFFF",
                    border: "4px solid #2C3E50",
                    borderRadius: 24,
                  }}
                >
                  <p style={{ fontSize: "1rem", color: "#2C3E50", fontWeight: 700, margin: 0 }}>กรุณาระบุเลขห้องให้ถูกต้อง</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto", background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 24 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>เลขห้อง</th>
                        <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>ประเภท</th>
                        <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>ค่าเช่า</th>
                        <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>เรทน้ำ</th>
                        <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>เรทไฟ</th>
                        <th style={{ padding: "16px 20px", textAlign: "left", borderBottom: "3px solid #2C3E50", fontWeight: 900, color: "#2C3E50", fontSize: "1rem" }}>ตัวเลือกเสริม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomNumbers.map((roomNumber) => (
                        <tr key={roomNumber}>
                          <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB" }}>
                            <strong style={{ fontWeight: 900, color: "#2C3E50" }}>{roomNumber}</strong>
                          </td>
                          <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB", color: "#2C3E50", fontWeight: 600 }}>{rates.roomType || "—"}</td>
                          <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB", color: "#2C3E50", fontWeight: 700 }}>{fmt(rates.baseRent)} บาท</td>
                          <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB", color: "#2C3E50", fontWeight: 700 }}>{fmt(rates.waterRate)}</td>
                          <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB", color: "#2C3E50", fontWeight: 700 }}>{fmt(rates.electricRate)}</td>
                          <td style={{ padding: "12px 20px", borderBottom: "2px solid #E5E7EB" }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {rates.options.length === 0 ? (
                                <span style={{ color: "#64748B", fontSize: "0.875rem", fontWeight: 600 }}>—</span>
                              ) : (
                                rates.options.map((opt, idx) => (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {result && (
            <div style={{ background: "#FFFFFF", border: "4px solid #2C3E50", borderRadius: 24, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "3px solid #2C3E50", background: "#FFD93D" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50", margin: 0 }}>ผลการสร้างห้อง</h2>
              </div>
              <div style={{ padding: "24px 28px" }}>
                <p style={{ marginBottom: 20, fontWeight: 700, color: "#2C3E50", fontSize: "1rem", margin: "0 0 20px 0" }}>
                  สร้างสำเร็จ <strong>{result.created.length}</strong> ห้อง, ล้มเหลว <strong>{result.failed.length}</strong> ห้อง
                </p>
                {result.created.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: "1.125rem", fontWeight: 900, color: "#2C3E50", marginBottom: 12 }}>สร้างสำเร็จ</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {result.created.map((item) => (
                        <span
                          key={item.roomId}
                          style={{
                            display: "inline-block",
                            padding: "6px 14px",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            background: "#7FDB9A",
                            color: "#2C3E50",
                            borderRadius: 12,
                            border: "2px solid #2C3E50",
                          }}
                        >
                          ห้อง {item.roomNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.failed.length > 0 && (
                  <div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 900, color: "#2C3E50", marginBottom: 12 }}>ล้มเหลว</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {result.failed.map((item) => (
                        <span
                          key={item.roomNumber}
                          style={{
                            display: "inline-block",
                            padding: "6px 14px",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            background: "#FFFFFF",
                            color: "#DC2626",
                            borderRadius: 12,
                            border: "2px solid #DC2626",
                          }}
                        >
                          ห้อง {item.roomNumber}: {reasonText(item.reason)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function BulkRoomsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 64, fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700 }}>กำลังโหลด...</div>}>
      <BulkRoomsContent params={params} />
    </Suspense>
  );
}
