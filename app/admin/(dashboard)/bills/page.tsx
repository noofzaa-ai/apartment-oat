"use client";

import { useState, useEffect, useCallback } from "react";
import Toast from "@/components/Toast";

interface LineItem {
  id: number;
  label: string;
  amount: number;
}

interface Bill {
  id: number;
  roomId: number;
  period: string;
  baseRent: number;
  waterUnits: number;
  waterCost: number;
  electricUnits: number;
  electricCost: number;
  optionsCost: number;
  total: number;
  paymentStatus: "PAID" | "UNPAID";
  paidAt: string | null;
  room: {
    id: number;
    roomNumber: string;
    roomType: string | null;
    waterRate: number;
    electricRate: number;
    options: { id: number; name: string; price: number }[];
    location: { id: number; name: string };
  };
  lineItems: LineItem[];
}

interface Location {
  id: number;
  name: string;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function thaiPeriod(period: string) {
  const [y, m] = period.split("-");
  const thaiYear = Number(y) + 543;
  const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return `${monthNames[Number(m) - 1]} ${thaiYear}`;
}

export default function BillsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((locs: Location[]) => {
        setLocations(locs);
        if (locs.length > 0) setSelectedLocationId(String(locs[0].id));
      });
  }, []);

  const loadBills = useCallback(async () => {
    if (!period) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (selectedLocationId) params.set("locationId", selectedLocationId);
      const res = await fetch(`/api/bills?${params}`);
      const data = await res.json();
      setBills(data);
    } catch {
      setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [period, selectedLocationId]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          locationId: selectedLocationId ? Number(selectedLocationId) : undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const errCount = result.errors?.length || 0;
      const okCount = result.results?.length || 0;
      let msg = `สร้างบิลสำเร็จ ${okCount} ห้อง`;
      if (errCount > 0) msg += ` (ข้ามไป ${errCount} ห้อง เพราะไม่มีข้อมูลมิเตอร์)`;
      setToast({ message: msg, type: okCount > 0 ? "success" : "error" });
      loadBills();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  const togglePaid = async (bill: Bill) => {
    const newStatus = bill.paymentStatus === "PAID" ? "UNPAID" : "PAID";
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      if (!res.ok) throw new Error("อัปเดตสถานะล้มเหลว");
      setToast({ message: newStatus === "PAID" ? "ทำเครื่องหมายจ่ายแล้ว" : "เปลี่ยนเป็นค้างชำระ", type: "success" });
      loadBills();
      // Update detail view if open
      if (detailBill?.id === bill.id) {
        const updated = await res.json();
        setDetailBill(updated);
      }
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    }
  };

  const handleExportCSV = () => {
    if (bills.length === 0) return;
    const headers = ["ห้อง","ประเภท","ค่าเช่า","ค่าน้ำ (หน่วย)","ค่าน้ำ","ค่าไฟ (หน่วย)","ค่าไฟ","ค่า options","รวม","สถานะ"];
    const rows = bills.map((b) => [
      b.room.roomNumber,
      b.room.roomType || "",
      b.baseRent,
      b.waterUnits,
      b.waterCost,
      b.electricUnits,
      b.electricCost,
      b.optionsCost,
      b.total,
      b.paymentStatus === "PAID" ? "จ่ายแล้ว" : "ค้างชำระ",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bills-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: "Export CSV สำเร็จ", type: "success" });
  };

  const handlePrint = () => {
    window.print();
  };

  // Summary totals
  const totalRent = bills.reduce((s, b) => s + b.baseRent, 0);
  const totalWater = bills.reduce((s, b) => s + b.waterCost, 0);
  const totalElec = bills.reduce((s, b) => s + b.electricCost, 0);
  const totalOptions = bills.reduce((s, b) => s + b.optionsCost, 0);
  const grandTotal = bills.reduce((s, b) => s + b.total, 0);
  const paidCount = bills.filter((b) => b.paymentStatus === "PAID").length;

  const selectedLocation = locations.find((l) => String(l.id) === selectedLocationId);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header no-print">
        <h1 className="page-title">บิลรายเดือน</h1>
        <div className="page-actions">
          {bills.length > 0 && (
            <>
              <button className="btn btn-secondary" onClick={handleExportCSV}>
                📊 Export CSV
              </button>
              <button className="btn btn-secondary" onClick={handlePrint}>
                🖨️ พิมพ์
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !period}>
            {generating ? "กำลังสร้าง..." : "⚡ สร้าง/รีเฟรชบิล"}
          </button>
        </div>
      </div>

      {/* Print header */}
      <div style={{ display: "none" }} className="print-header">
        <h2>บิลรายเดือน — {period ? thaiPeriod(period) : ""}</h2>
        {selectedLocation && <p>หอพัก: {selectedLocation.name}</p>}
      </div>

      <div className="toolbar no-print">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: "0.8rem", marginBottom: 4 }}>หอพัก</label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="">-- ทุกหอพัก --</option>
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
        {period && (
          <span style={{ alignSelf: "flex-end", paddingBottom: 2, color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            {thaiPeriod(period)}
            {selectedLocation && ` — ${selectedLocation.name}`}
          </span>
        )}
      </div>

      {loading ? (
        <div className="loading">กำลังโหลด...</div>
      ) : bills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <p className="empty-state-text">ยังไม่มีบิลเดือนนี้</p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "var(--space-md)" }}>
            กด &quot;สร้าง/รีเฟรชบิล&quot; หลังจากบันทึกมิเตอร์แล้ว
          </p>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? "กำลังสร้าง..." : "⚡ สร้างบิล"}
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-card-label">ค่าเช่ารวม</div>
              <div className="summary-card-value">{fmt(totalRent)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 2 }}>บาท</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">ค่าน้ำรวม</div>
              <div className="summary-card-value" style={{ color: "var(--color-info)" }}>{fmt(totalWater)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 2 }}>บาท</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">ค่าไฟรวม</div>
              <div className="summary-card-value" style={{ color: "var(--color-warning)" }}>{fmt(totalElec)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 2 }}>บาท</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">ค่า Options รวม</div>
              <div className="summary-card-value">{fmt(totalOptions)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 2 }}>บาท</div>
            </div>
            <div className="summary-card" style={{ borderLeft: "3px solid var(--color-primary)" }}>
              <div className="summary-card-label">ยอดรวมทั้งหมด</div>
              <div className="summary-card-value" style={{ color: "var(--color-primary)" }}>{fmt(grandTotal)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: 2 }}>
                บาท · จ่ายแล้ว {paidCount}/{bills.length} ห้อง
              </div>
            </div>
          </div>

          {/* Bills Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ห้อง</th>
                  <th>ค่าเช่า</th>
                  <th>ค่าน้ำ</th>
                  <th>ค่าไฟ</th>
                  <th>Options</th>
                  <th>รวม</th>
                  <th>สถานะ</th>
                  <th className="no-print">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td>
                      <strong
                        style={{ cursor: "pointer", color: "var(--color-primary)" }}
                        onClick={() => setDetailBill(bill)}
                      >
                        {bill.room.roomNumber}
                      </strong>
                      {bill.room.roomType && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          {bill.room.roomType}
                        </div>
                      )}
                    </td>
                    <td>{fmt(bill.baseRent)}</td>
                    <td>
                      {fmt(bill.waterCost)}
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                        ({bill.waterUnits} หน่วย)
                      </div>
                    </td>
                    <td>
                      {fmt(bill.electricCost)}
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                        ({bill.electricUnits} หน่วย)
                      </div>
                    </td>
                    <td>{bill.optionsCost > 0 ? fmt(bill.optionsCost) : "—"}</td>
                    <td><strong>{fmt(bill.total)}</strong></td>
                    <td>
                      <span className={`badge ${bill.paymentStatus === "PAID" ? "badge-success" : "badge-warning"}`}>
                        {bill.paymentStatus === "PAID" ? "จ่ายแล้ว" : "ค้างชำระ"}
                      </span>
                    </td>
                    <td className="no-print">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setDetailBill(bill)}
                        >
                          รายละเอียด
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => window.open(`/api/admin/bills/${bill.id}/pdf`, "_blank")}
                          title="ดาวน์โหลด PDF"
                        >
                          PDF
                        </button>
                        <button
                          className={`btn btn-sm ${bill.paymentStatus === "PAID" ? "btn-secondary" : "btn-success"}`}
                          onClick={() => togglePaid(bill)}
                        >
                          {bill.paymentStatus === "PAID" ? "ยกเลิก" : "จ่ายแล้ว"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-total">
                  <td><strong>รวมทั้งหมด</strong></td>
                  <td><strong>{fmt(totalRent)}</strong></td>
                  <td><strong>{fmt(totalWater)}</strong></td>
                  <td><strong>{fmt(totalElec)}</strong></td>
                  <td><strong>{fmt(totalOptions)}</strong></td>
                  <td><strong>{fmt(grandTotal)}</strong></td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* Bill Detail Modal */}
      {detailBill && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetailBill(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">
                รายละเอียดบิล — ห้อง {detailBill.room.roomNumber}
              </h2>
              <button className="modal-close" onClick={() => setDetailBill(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Room info */}
              <div className="detail-grid" style={{ marginBottom: "var(--space-md)" }}>
                <div className="detail-item">
                  <span className="detail-label">หอพัก</span>
                  <span className="detail-value">{detailBill.room.location.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">ห้อง</span>
                  <span className="detail-value">{detailBill.room.roomNumber} {detailBill.room.roomType ? `(${detailBill.room.roomType})` : ""}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">เดือน</span>
                  <span className="detail-value">{thaiPeriod(detailBill.period)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">สถานะ</span>
                  <span className={`badge ${detailBill.paymentStatus === "PAID" ? "badge-success" : "badge-warning"}`}>
                    {detailBill.paymentStatus === "PAID" ? "จ่ายแล้ว" : "ค้างชำระ"}
                  </span>
                </div>
              </div>

              <div className="divider" />

              {/* Meter info */}
              <div className="section-title">ข้อมูลการใช้งาน</div>
              <div className="detail-grid" style={{ marginBottom: "var(--space-md)" }}>
                <div className="detail-item">
                  <span className="detail-label">💧 น้ำที่ใช้</span>
                  <span className="detail-value">{detailBill.waterUnits} หน่วย × {detailBill.room.waterRate} บาท</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">⚡ ไฟที่ใช้</span>
                  <span className="detail-value">{detailBill.electricUnits} หน่วย × {detailBill.room.electricRate} บาท</span>
                </div>
              </div>

              <div className="divider" />

              {/* Line Items breakdown */}
              <div className="section-title">รายการค่าใช้จ่าย</div>
              <div style={{ background: "var(--color-bg-lighter)", borderRadius: "var(--border-radius)", padding: "var(--space-md)" }}>
                {detailBill.lineItems.length > 0 ? (
                  detailBill.lineItems.map((item) => (
                    <div key={item.id} className="breakdown-row">
                      <span>{item.label}</span>
                      <span>{fmt(item.amount)} บาท</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="breakdown-row"><span>ค่าเช่า</span><span>{fmt(detailBill.baseRent)} บาท</span></div>
                    <div className="breakdown-row"><span>ค่าน้ำ</span><span>{fmt(detailBill.waterCost)} บาท</span></div>
                    <div className="breakdown-row"><span>ค่าไฟ</span><span>{fmt(detailBill.electricCost)} บาท</span></div>
                    {detailBill.optionsCost > 0 && <div className="breakdown-row"><span>ค่า Options</span><span>{fmt(detailBill.optionsCost)} บาท</span></div>}
                  </>
                )}
                <div className="breakdown-row breakdown-total">
                  <span>รวมทั้งสิ้น</span>
                  <strong>{fmt(detailBill.total)} บาท</strong>
                </div>
              </div>

              {detailBill.paidAt && (
                <p style={{ marginTop: "var(--space-md)", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  ชำระเมื่อ: {new Date(detailBill.paidAt).toLocaleString("th-TH")}
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailBill(null)}>
                ปิด
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => window.open(`/api/admin/bills/${detailBill.id}/pdf`, "_blank")}
              >
                ดาวน์โหลด PDF
              </button>
              <button
                className={`btn ${detailBill.paymentStatus === "PAID" ? "btn-secondary" : "btn-success"}`}
                onClick={() => togglePaid(detailBill)}
              >
                {detailBill.paymentStatus === "PAID" ? "เปลี่ยนเป็นค้างชำระ" : "ทำเครื่องหมายจ่ายแล้ว ✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
