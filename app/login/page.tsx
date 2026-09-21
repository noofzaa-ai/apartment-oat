import "@/app/auth.css";

export default function LoginPage() {
  return (
    <div className="auth-root">
      <a className="auth-home" href="/">← กลับหน้าหลัก</a>
      <div className="auth-glow" aria-hidden="true" />
      <div className="auth-card">
        <div className="auth-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="auth-mascot" src="/landing/oatty-payments.png" width={120} height={120} alt="โอ๊ตตี้ มาสคอต" />
          <div className="auth-brand">
            <span className="auth-brand-orb" aria-hidden="true">✦</span>
            apartments<span className="auth-brand-dot">.</span>
          </div>
          <h1 className="auth-title">ระบบจัดการหอพัก</h1>
          <p className="auth-subtitle">เข้าสู่ระบบด้วย Daiyooo เพื่อใช้งานเจ้าของหอหรือผู้เช่า</p>
        </div>

        <form action="/auth/login" method="get" style={{ display: "contents" }}>
          <button type="submit" className="auth-submit" style={{ display: "block", width: "100%", textAlign: "center" }}>
            เข้าสู่ระบบด้วย Daiyooo
          </button>
        </form>

        <div className="auth-switch">
          <p className="auth-switch-note">
            ต้องการเปลี่ยนบัญชีหรืออีเมล?{" "}
            <a href="/auth/login">
              เปลี่ยนบัญชี/เปลี่ยนอีเมล
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
