// PDF bill generator using pdfkit
// Embeds the bundled Helvetica-like font — for Thai text we use a bundled open font.
// Since embedding a Thai TTF requires the file at build time, we keep layout in English
// for field labels and use UTF-8 for Thai values by registering a Thai-capable font.
// Note: pdfkit ships with Helvetica which does NOT support Thai glyphs.
// We bundle NotoSansThai — download once and reference from /public/fonts/.

import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

// Bundled Thai-capable fonts (Sarabun). Resolved relative to the project root so
// they are found in both `next dev` and the standalone production build.
const THAI_REGULAR = path.join(process.cwd(), "assets/fonts/Sarabun-Regular.ttf");
const THAI_BOLD = path.join(process.cwd(), "assets/fonts/Sarabun-Bold.ttf");

export interface BillPdfData {
  locationName: string;
  roomNumber: string;
  roomType?: string | null;
  period: string; // YYYY-MM
  baseRent: number;
  waterUnits: number;
  waterCost: number;
  waterRate: number;
  electricUnits: number;
  electricCost: number;
  electricRate: number;
  optionsCost: number;
  total: number;
  paymentStatus: string;
  paidAt?: Date | string | null;
  lineItems?: { label: string; amount: number }[];
}

function thaiMonth(period: string) {
  const [y, m] = period.split("-");
  const thaiYear = Number(y) + 543;
  const months = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
  ];
  return `${months[Number(m) - 1]} ${thaiYear}`;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusLabel(s: string) {
  if (s === "PAID") return "ชำระแล้ว";
  if (s === "SUBMITTED") return "รอยืนยัน";
  return "ค้างชำระ";
}

export function generateBillPdf(data: BillPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Prefer the bundled Sarabun font; allow an env override for the regular weight.
    const regularPath = process.env.THAI_FONT_PATH || THAI_REGULAR;
    const boldPath = THAI_BOLD;

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
      info: {
        Title: `บิล ${data.roomNumber} ${thaiMonth(data.period)}`,
        Author: "ApartmentOAT",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Register Thai fonts (regular + bold). Fall back to Helvetica if the files
    // are missing so PDF generation never throws.
    let useThaiFont = false;
    try {
      if (fs.existsSync(regularPath)) {
        doc.registerFont("Thai", regularPath);
        doc.registerFont("Thai-Bold", fs.existsSync(boldPath) ? boldPath : regularPath);
        useThaiFont = true;
      }
    } catch {
      // Fall back to Helvetica
    }

    const setFont = (size: number, bold = false) => {
      if (useThaiFont) {
        doc.font(bold ? "Thai-Bold" : "Thai").fontSize(size);
      } else {
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
      }
    };

    const pageWidth = doc.page.width - 120; // content width

    // ── Header ──
    setFont(20, true);
    doc.fillColor("#2D5BE3").text("ApartmentOAT", 60, 50);

    setFont(12, true);
    doc.fillColor("#0F172A").text("ใบแจ้งหนี้ / Invoice", 60, 80);

    // Right-aligned period
    setFont(11);
    doc.fillColor("#475569").text(`เดือน: ${thaiMonth(data.period)}`, 60, 80, {
      align: "right",
      width: pageWidth,
    });

    doc.moveTo(60, 105).lineTo(535, 105).strokeColor("#E2E8F0").lineWidth(1).stroke();

    // ── Room & Location Info ──
    let y = 120;
    setFont(10);
    doc.fillColor("#475569");

    const infoItems = [
      ["หอพัก", data.locationName],
      ["ห้อง", `${data.roomNumber}${data.roomType ? ` (${data.roomType})` : ""}`],
      ["เดือน", thaiMonth(data.period)],
      ["สถานะ", statusLabel(data.paymentStatus)],
    ];

    infoItems.forEach(([label, value]) => {
      setFont(9);
      doc.fillColor("#94A3B8").text(label, 60, y);
      setFont(10, true);
      doc.fillColor("#0F172A").text(value, 160, y);
      y += 20;
    });

    y += 10;
    doc.moveTo(60, y).lineTo(535, y).strokeColor("#E2E8F0").lineWidth(0.5).stroke();
    y += 16;

    // ── Line Items ──
    setFont(10, true);
    doc.fillColor("#475569").text("รายการค่าใช้จ่าย", 60, y);
    y += 18;

    // Table header
    doc.rect(60, y, pageWidth, 24).fill("#F8FAFC");
    setFont(9, true);
    doc.fillColor("#475569");
    doc.text("รายการ", 72, y + 7);
    doc.text("จำนวน (บาท)", 350, y + 7, { width: 165, align: "right" });
    y += 24;

    // Line items rows
    const items = data.lineItems && data.lineItems.length > 0
      ? data.lineItems
      : [
          { label: "ค่าเช่าห้อง", amount: data.baseRent },
          { label: `ค่าน้ำ (${data.waterUnits} หน่วย × ${data.waterRate} บ.)`, amount: data.waterCost },
          { label: `ค่าไฟ (${data.electricUnits} หน่วย × ${data.electricRate} บ.)`, amount: data.electricCost },
          ...(data.optionsCost > 0 ? [{ label: "ค่า Options รวม", amount: data.optionsCost }] : []),
        ];

    items.forEach((item, idx) => {
      const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
      doc.rect(60, y, pageWidth, 22).fill(rowBg);

      setFont(9);
      doc.fillColor("#0F172A").text(item.label, 72, y + 6, { width: 270 });

      doc.font("Courier").fontSize(9).fillColor("#0F172A")
        .text(fmt(item.amount), 350, y + 6, { width: 165, align: "right" });
      y += 22;
    });

    // Total row
    doc.rect(60, y, pageWidth, 28).fill("#EEF2FF");
    setFont(10, true);
    doc.fillColor("#0F172A").text("ยอดรวมทั้งสิ้น", 72, y + 8);
    setFont(12, true);
    doc.fillColor("#2D5BE3")
      .text(fmt(data.total) + " บาท", 350, y + 8, { width: 165, align: "right" });
    y += 28;

    // ── Payment info ──
    y += 16;
    if (data.paymentStatus === "PAID" && data.paidAt) {
      setFont(9);
      const paidDate = new Date(data.paidAt).toLocaleDateString("th-TH", {
        year: "numeric", month: "long", day: "numeric",
      });
      doc.fillColor("#059669").text(`ชำระแล้วเมื่อ ${paidDate}`, 60, y);
      y += 16;
    }

    // ── Footer ──
    const footerY = doc.page.height - 60;
    doc.moveTo(60, footerY - 10).lineTo(535, footerY - 10).strokeColor("#E2E8F0").lineWidth(0.5).stroke();
    setFont(8);
    doc.fillColor("#94A3B8")
      .text("เอกสารนี้สร้างโดยระบบ ApartmentOAT — กรุณาเก็บไว้เป็นหลักฐาน", 60, footerY, {
        align: "center", width: pageWidth,
      });

    doc.end();
  });
}
