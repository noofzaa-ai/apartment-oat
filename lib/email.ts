// Email utility — sends via SMTP when configured, logs to console in dev mode
import nodemailer from "nodemailer";

interface SendPinEmailOptions {
  to: string;
  tenantName: string;
  pin: string;
  roomNumber?: string;
  locationName?: string;
}

export async function sendPinEmail(opts: SendPinEmailOptions): Promise<{ sent: boolean; devLog?: boolean }> {
  const { to, tenantName, pin, roomNumber, locationName } = opts;

  const subject = "PIN เข้าสู่ระบบจัดการหอพัก";
  const roomInfo = roomNumber ? `ห้อง ${roomNumber}${locationName ? ` · ${locationName}` : ""}` : "";
  const textBody = [
    `คุณ${tenantName} สวัสดีครับ/ค่ะ`,
    "",
    `PIN สำหรับเข้าสู่ระบบจัดการหอพักของคุณคือ: ${pin}`,
    roomInfo ? `ข้อมูลห้อง: ${roomInfo}` : "",
    "",
    "กรุณาเก็บ PIN นี้เป็นความลับและอย่าแบ่งปันกับผู้อื่น",
    "",
    "ระบบจัดการหอพัก",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff;border-radius:12px;border:1px solid #E2E8F0">
      <div style="font-size:1.25rem;font-weight:800;color:#0F172A;margin-bottom:8px">ระบบจัดการหอพัก</div>
      <p style="color:#475569;margin-bottom:24px">คุณ${tenantName} สวัสดีครับ/ค่ะ</p>
      <p style="color:#0F172A;margin-bottom:16px">PIN สำหรับเข้าสู่ระบบจัดการหอพักของคุณคือ:</p>
      <div style="background:#EEF2FF;border:2px solid #C7D2FE;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
        <span style="font-family:monospace;font-size:2rem;font-weight:800;letter-spacing:0.2em;color:#2D5BE3">${pin}</span>
      </div>
      ${roomInfo ? `<p style="color:#475569;margin-bottom:16px">ข้อมูลห้อง: <strong>${roomInfo}</strong></p>` : ""}
      <p style="color:#94A3B8;font-size:0.875rem">กรุณาเก็บ PIN นี้เป็นความลับและอย่าแบ่งปันกับผู้อื่น</p>
    </div>`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM ?? smtpUser ?? "noreply@apartment.local";

  if (!smtpHost || !smtpUser || !smtpPass) {
    // Dev mode: log to console instead of sending
    console.log("\n========= [DEV EMAIL LOG] =========");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(textBody);
    console.log("====================================\n");
    return { sent: false, devLog: true };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text: textBody,
    html: htmlBody,
  });

  return { sent: true };
}
