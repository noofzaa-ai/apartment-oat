"use client";

import { useState, useEffect, useCallback } from "react";
import Toast from "@/components/Toast";

interface Location {
  id: number;
  name: string;
}

interface RoomReadingData {
  room: {
    id: number;
    roomNumber: string;
    roomType: string | null;
    location: { name: string };
  };
  current: { waterReading: number; electricReading: number } | null;
  previous: { waterReading: number; electricReading: number } | null;
  prevPeriod: string;
}

interface InputRow {
  roomId: number;
  waterReading: string;
  electricReading: string;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function thaiPeriod(period: string) {
  const [y, m] = period.split("-");
  const thaiYear = Number(y) + 543;
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return `${monthNames[Number(m) - 1]} ${thaiYear}`;
}

export default function MeterReadingPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [data, setData] = useState<RoomReadingData[]>([]);
  const [inputs, setInputs] = useState<InputRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((locs: Location[]) => {
        setLocations(locs);
        if (locs.length > 0) setSelectedLocationId(String(locs[0].id));
      });
  }, []);

  const loadReadings = useCallback(async () => {
    if (!selectedLocationId || !period) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/meter-readings?locationId=${selectedLocationId}&period=${period}`);
      const rows: RoomReadingData[] = await res.json();
      setData(rows);
      // Populate inputs from existing readings or empty
      setInputs(
        rows.map((r) => ({
          roomId: r.room.id,
          waterReading: r.current ? String(r.current.waterReading) : "",
          electricReading: r.current ? String(r.current.electricReading) : "",
        }))
      );
    } catch {
      setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId, period]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const updateInput = (idx: number, field: "waterReading" | "electricReading", value: string) => {
    const updated = [...inputs];
    updated[idx] = { ...updated[idx], [field]: value };
    setInputs(updated);
  };

  const handleSave = async () => {
    const readings = inputs
      .filter((r) => r.waterReading !== "" && r.electricReading !== "")
      .map((r) => ({
        roomId: r.roomId,
        waterReading: Number(r.waterReading),
        electricReading: Number(r.electricReading),
      }));

    if (readings.length === 0) {
      setToast({ message: "กรุณากรอกข้อมูลมิเตอร์อย่างน้อย 1 ห้อง", type: "error" });
      return;
    }

    // Check for negative deltas
    const warnings: string[] = [];
    readings.forEach((r, i) => {
      const d = data[i];
      if (d?.previous) {
        if (r.waterReading < d.previous.waterReading) {
          warnings.push(`ห้อง ${d.room.roomNumber}: เลขมิเตอร์น้ำน้อยกว่าเดือนก่อน`);
        }
        if (r.electricReading < d.previous.electricReading) {
          warnings.push(`ห้อง ${d.room.roomNumber}: เลขมิเตอร์ไฟน้อยกว่าเดือนก่อน`);
        }
      }
    });

    if (warnings.length > 0) {
      const confirmed = window.confirm(
        `⚠️ พบข้อมูลที่ผิดปกติ:\n${warnings.join("\n")}\n\nต้องการบันทึกต่อหรือไม่?`
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/meter-readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, readings }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setToast({ message: `บันทึกมิเตอร์สำเร็จ ${result.saved} ห้อง`, type: "success" });
      loadReadings();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1 className="page-title">อ่านมิเตอร์</h1>
      </div>

      <div className="toolbar">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: "0.8rem", marginBottom: 4 }}>หอพัก</label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="">-- เลือกหอพัก --</option>
            {locations.map((l) => (
              <option key={l.id} value={String(l.id)}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: "0.8rem", marginBottom: 4 }}>เดือน</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: "auto" }}
          />
        </div>
        {period && <span style={{ alignSelf: "flex-end", paddingBottom: 2, color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
          {thaiPeriod(period)}
        </span>}
      </div>

      {!selectedLocationId ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-text">กรุณาเลือกหอพัก</p>
        </div>
      ) : loading ? (
        <div className="loading">กำลังโหลด...</div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚪</div>
          <p className="empty-state-text">ไม่มีห้องในหอพักนี้</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ห้อง</th>
                  <th colSpan={2} style={{ textAlign: "center", background: "rgba(59,130,246,0.06)" }}>
                    💧 มิเตอร์น้ำ
                  </th>
                  <th colSpan={2} style={{ textAlign: "center", background: "rgba(245,158,11,0.06)" }}>
                    ⚡ มิเตอร์ไฟ
                  </th>
                  <th>หมายเหตุ</th>
                </tr>
                <tr>
                  <th></th>
                  <th style={{ background: "rgba(59,130,246,0.06)" }}>เดือนก่อน</th>
                  <th style={{ background: "rgba(59,130,246,0.06)" }}>เดือนนี้</th>
                  <th style={{ background: "rgba(245,158,11,0.06)" }}>เดือนก่อน</th>
                  <th style={{ background: "rgba(245,158,11,0.06)" }}>เดือนนี้</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const inp = inputs[idx];
                  const prevWater = row.previous?.waterReading;
                  const prevElec = row.previous?.electricReading;
                  const currWater = inp?.waterReading !== "" ? Number(inp?.waterReading) : null;
                  const currElec = inp?.electricReading !== "" ? Number(inp?.electricReading) : null;
                  const waterWarn = prevWater != null && currWater != null && currWater < prevWater;
                  const elecWarn = prevElec != null && currElec != null && currElec < prevElec;

                  return (
                    <tr key={row.room.id}>
                      <td><strong>{row.room.roomNumber}</strong></td>
                      <td style={{ background: "rgba(59,130,246,0.03)" }}>
                        {prevWater != null ? (
                          <span className="meter-prev-value">{prevWater.toLocaleString()}</span>
                        ) : (
                          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>ไม่มีข้อมูล</span>
                        )}
                      </td>
                      <td className="meter-input-cell" style={{ background: "rgba(59,130,246,0.03)" }}>
                        <input
                          type="number"
                          value={inp?.waterReading ?? ""}
                          onChange={(e) => updateInput(idx, "waterReading", e.target.value)}
                          placeholder="กรอกเลข"
                          min="0"
                          step="0.1"
                          style={{ textAlign: "right", width: "110px", borderColor: waterWarn ? "var(--color-warning)" : undefined }}
                        />
                      </td>
                      <td style={{ background: "rgba(245,158,11,0.03)" }}>
                        {prevElec != null ? (
                          <span className="meter-prev-value">{prevElec.toLocaleString()}</span>
                        ) : (
                          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>ไม่มีข้อมูล</span>
                        )}
                      </td>
                      <td className="meter-input-cell" style={{ background: "rgba(245,158,11,0.03)" }}>
                        <input
                          type="number"
                          value={inp?.electricReading ?? ""}
                          onChange={(e) => updateInput(idx, "electricReading", e.target.value)}
                          placeholder="กรอกเลข"
                          min="0"
                          step="0.1"
                          style={{ textAlign: "right", width: "110px", borderColor: elecWarn ? "var(--color-warning)" : undefined }}
                        />
                      </td>
                      <td>
                        {!row.previous && (
                          <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>ไม่มีข้อมูลเดือนก่อน</span>
                        )}
                        {(waterWarn || elecWarn) && (
                          <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>ค่าลดลง</span>
                        )}
                        {row.current && !waterWarn && !elecWarn && (
                          <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>บันทึกแล้ว</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-lg)", gap: "var(--space-md)" }}>
            <button className="btn btn-secondary" onClick={loadReadings} disabled={saving}>
              รีเฟรช
            </button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "💾 บันทึกมิเตอร์"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
