import LandingClient from "./LandingClient";
import "./landing.css";

// Landing page is fully static, so Next.js emits `Cache-Control: s-maxage=31536000`
// (1 year) by default — CSS/markup fixes then take a very long time to propagate
// via the CDN/edge. Setting an explicit revalidate keeps the page prerendered (ISR)
// but caps the effective shared cache TTL at 5 minutes so edits appear within minutes.
export const revalidate = 300;

export const metadata = {
  title: "Apartments by Daiyooo — เรื่องหอพัก จัดการให้ได้อยู่",
  description:
    "Apartments by Daiyooo ระบบจัดการหอพักสำหรับเจ้าของหอและผู้เช่า จดมิเตอร์ ออกบิล แจ้งชำระ และตรวจสลิปในที่เดียว",
};

export default async function Home() {
  return (
    <div className="landing-root">
      <a className="skip-link" href="#main">ข้ามไปยังเนื้อหา</a>
      <header className="site-header" id="top">
        <div className="container header-inner">
          <a className="brand" href="#top" aria-label="Apartments by Daiyooo กลับไปด้านบน">
            <span className="brand-orb" aria-hidden="true">✦</span>
            <span>apartments<span className="brand-dot">.</span><small>by daiyooo</small></span>
          </a>
          <nav className="desktop-nav" aria-label="เมนูหลัก">
            <a href="#features">ฟีเจอร์</a>
            <a href="#how-it-works">วิธีทำงาน</a>
            <a href="#for-who">สำหรับใคร</a>
          </nav>
          <form action="/auth/login" method="get" style={{ display: "contents" }}>
            <input type="hidden" name="return_to" value="/app/(dashboard)/locations" />
            <button type="submit" className="header-cta" style={{ border: 0 }}>เข้าสู่ระบบ <span aria-hidden="true">↗</span></button>
          </form>
          <LandingClient />
        </div>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-glow" aria-hidden="true"></div>
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow"><span className="eyebrow-mark">✳</span> APARTMENTS BY DAIYOOO</p>
              <h1 id="hero-title">ดูแลหอพักให้<br /><em>ง่ายขึ้นทุกเดือน</em><span className="headline-spark" aria-hidden="true">✦</span></h1>
              <p className="hero-description">จดมิเตอร์ ออกบิล ดูยอดค้าง และตรวจสลิปในที่เดียว เจ้าของหอทำงานไวขึ้น ผู้เช่าดูบิลของตัวเองได้ชัดเจน</p>
              <div className="hero-actions">
                <a className="button button-primary" href="/login">เข้าสู่ระบบ <span aria-hidden="true">↗</span></a>
              </div>
              <p className="hero-note"><span className="tiny-star" aria-hidden="true">✦</span> มีโอ๊ตตี้ช่วยดูแลเรื่องจุกจิก</p>
            </div>
            <div className="hero-art" id="hero-art" aria-label="โอ๊ตตี้ มาสคอตลูกปิงปองสีเหลืองของ Apartments">
              <div className="hero-backplate backplate-warm" aria-hidden="true"></div><div className="hero-backplate backplate-lilac" aria-hidden="true"></div>
              <div className="hero-pill pill-top" aria-hidden="true"><span className="status-light"></span> บิลเดือนนี้พร้อมแล้ว</div>
              <div className="hero-pill pill-bottom" aria-hidden="true"><span className="pill-check">✓</span> ดูแลครบทุกห้อง</div>
              <span className="hero-star star-one" aria-hidden="true">✦</span><span className="hero-star star-two" aria-hidden="true">✳</span>
              <div className="mascot-shadow" aria-hidden="true"></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-mascot" src="/landing/oatty-hero.png" width={760} height={760} alt="โอ๊ตตี้ มาสคอตทรงกลมสีเหลืองกำลังทักทาย" fetchPriority="high" />
            </div>
          </div>
          <div className="container hero-strip" aria-label="งานที่ระบบช่วยจัดการ">
            <span>ห้องพัก</span><b>✳</b><span>มิเตอร์</span><b>✳</b><span>บิลรายเดือน</span><b>✳</b><span>แจ้งชำระ</span><b>✳</b><span>สลิป</span>
          </div>
        </section>

        <section className="intro section" id="features" aria-labelledby="features-title">
          <div className="container">
            <div className="section-head reveal">
              <div><p className="section-kicker">01 / จัดการได้ในที่เดียว</p><h2 id="features-title">งานหอพักเยอะได้<br /><span className="highlight-stroke">แต่ไม่ต้องยุ่ง</span></h2></div>
              <p>จากเลขมิเตอร์จนถึงยอดชำระ ทุกอย่างต่อกันเป็นขั้นตอน เปิดดูก็รู้ว่าห้องไหนอยู่ตรงไหนแล้ว</p>
            </div>
            <div className="feature-grid">
              <article className="feature-card feature-rooms reveal">
                <div className="feature-top"><span className="feature-number">01 / ROOMS</span><span className="card-arrow" aria-hidden="true">↗</span></div>
                <div className="feature-image-wrap">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/landing/oatty-rooms.png" width={420} height={420} loading="lazy" alt="โอ๊ตตี้กับการ์ดห้องพัก" /></div>
                <h3>ห้องพักเป็นระเบียบ</h3><p>แยกหอพัก ห้อง ค่าเช่า และค่าใช้จ่ายเพิ่มเติมไว้ชัดเจน แก้ข้อมูลแต่ละห้องได้ง่าย</p>
                <div className="feature-tag">จัดการห้องและผู้เช่า</div>
              </article>
              <article className="feature-card feature-bills reveal">
                <div className="feature-top"><span className="feature-number">02 / BILLS</span><span className="card-arrow" aria-hidden="true">↗</span></div>
                <div className="feature-image-wrap">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/landing/oatty-bills.png" width={420} height={420} loading="lazy" alt="โอ๊ตตี้กับมิเตอร์และบิล" /></div>
                <h3>จดมิเตอร์ แล้วออกบิล</h3><p>เทียบเลขน้ำไฟกับเดือนก่อน คำนวณค่าเช่าและค่าใช้จ่ายรวม พร้อมแจกแจงยอดในบิล</p>
                <div className="feature-tag">มิเตอร์ + บิล PDF</div>
              </article>
              <article className="feature-card feature-payments reveal">
                <div className="feature-top"><span className="feature-number">03 / PAYMENTS</span><span className="card-arrow" aria-hidden="true">↗</span></div>
                <div className="feature-image-wrap">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/landing/oatty-payments.png" width={420} height={420} loading="lazy" alt="โอ๊ตตี้กับสัญลักษณ์ยืนยันการชำระ" /></div>
                <h3>รับแจ้งชำระ ไม่ตกหล่น</h3><p>ผู้เช่าอัปโหลดสลิปได้เอง แอดมินตรวจและยืนยัน ก่อนอัปเดตสถานะบิล</p>
                <div className="feature-tag">สลิป + สถานะชำระ</div>
              </article>
            </div>
          </div>
        </section>

        <section className="flow section" id="how-it-works" aria-labelledby="flow-title">
          <div className="container flow-layout">
            <div className="flow-intro reveal"><p className="section-kicker">02 / เดือนหนึ่ง ทำอะไรบ้าง</p><h2 id="flow-title">จากจดมิเตอร์<br />ถึงปิดยอด <span>ใน 4 ขั้น</span></h2><p>ขั้นตอนเดิมที่เจ้าของหอทำทุกเดือน เอามาเรียงให้ต่อเนื่องในระบบเดียว</p><div className="flow-mark" aria-hidden="true">✳</div></div>
            <ol className="flow-steps">
              <li className="flow-step reveal"><span className="step-index">01</span><div><h3>กรอกเลขมิเตอร์</h3><p>เห็นเลขเดือนก่อนประกอบ แล้วกรอกเลขน้ำและไฟของเดือนนี้</p></div><span className="step-glyph" aria-hidden="true">◉</span></li>
              <li className="flow-step reveal"><span className="step-index">02</span><div><h3>ออกบิลรายเดือน</h3><p>ระบบรวมค่าเช่า ค่าน้ำ ค่าไฟ และ options เป็นบิลที่ดูย้อนหลังได้</p></div><span className="step-glyph" aria-hidden="true">▤</span></li>
              <li className="flow-step reveal"><span className="step-index">03</span><div><h3>ผู้เช่าแจ้งชำระ</h3><p>ผู้เช่าเข้าดูบิลของห้องตัวเอง และส่งสลิปเพื่อแจ้งชำระ</p></div><span className="step-glyph" aria-hidden="true">↥</span></li>
              <li className="flow-step reveal"><span className="step-index">04</span><div><h3>ตรวจสลิป ปิดยอด</h3><p>แอดมินอนุมัติหรือปฏิเสธสลิป พร้อมดูสถานะจ่ายแล้วและค้างชำระ</p></div><span className="step-glyph" aria-hidden="true">✓</span></li>
            </ol>
          </div>
        </section>

        <section className="roles section" id="for-who" aria-labelledby="roles-title">
          <div className="container"><div className="roles-head reveal"><p className="section-kicker">03 / สองฝั่ง เห็นสิ่งที่ต้องเห็น</p><h2 id="roles-title">เจ้าของหอสะดวก<br />ผู้เช่าก็สบายใจ</h2></div>
            <div className="role-grid">
              <a className="role-card role-admin reveal" href="/login"><div className="role-icon" aria-hidden="true">⌘</div><p className="role-label">สำหรับเจ้าของหอ</p><h3>จัดการทุกห้อง<br />จากที่เดียว</h3><p>ดูหอพัก ห้อง ผู้เช่า มิเตอร์ บิล และรายการรอตรวจสลิป</p><div className="role-decoration" aria-hidden="true"><span className="mini-room">ห้อง 101 <i>จ่ายแล้ว</i></span><span className="mini-room">ห้อง 102 <i className="pending">รอตรวจ</i></span><span className="mini-room">ห้อง 103 <i>จ่ายแล้ว</i></span></div></a>
              <a className="role-card role-tenant reveal" href="/login"><div className="role-icon" aria-hidden="true">⌂</div><p className="role-label">สำหรับผู้เช่า</p><h3>เรื่องห้องตัวเอง<br />ดูได้ทุกเวลา</h3><p>เช็กบิลและมิเตอร์ย้อนหลัง ดาวน์โหลด PDF และอัปโหลดสลิปจากหน้าเดียว</p><div className="tenant-note" aria-hidden="true"><span>บิลห้องของฉัน</span><strong>ดูรายการครบ ชัดเจน</strong><span className="note-check">✓</span></div></a>
            </div>
          </div>
        </section>

        <section className="closing section" aria-labelledby="closing-title">
          <div className="container closing-inner reveal"><div className="closing-spark" aria-hidden="true">✦</div><p className="section-kicker">APARTMENTS BY DAIYOOO</p><h2 id="closing-title">เรื่องหอพัก<br /><em>จัดการให้ได้อยู่</em></h2><p>ให้เวลาของคุณกลับไปอยู่กับการดูแลหอพัก แทนการไล่ตามบิลทีละห้อง</p><form action="/auth/login" method="get" style={{ display: "contents" }}><input type="hidden" name="return_to" value="/app/(dashboard)/locations" /><button type="submit" className="button button-dark" style={{ border: 0 }}>เข้าสู่ระบบ <span aria-hidden="true">↗</span></button></form>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="closing-mascot" src="/landing/oatty-hero.png" width={300} height={300} loading="lazy" alt="" aria-hidden="true" /></div>
        </section>
      </main>

      <footer className="site-footer"><div className="container footer-inner"><div><strong>apartments<span>.</span></strong><p>อีกหนึ่งของที่เราทำจาก daiyooo</p></div><div className="footer-links"><a href="https://www.daiyooo.com/">daiyooo.com <span aria-hidden="true">↗</span></a><a href="#top">กลับขึ้นด้านบน ↑</a></div><small>© 2026 Daiyooo. คิดเล่น แต่ทำจริง</small></div></footer>
    </div>
  );
}
