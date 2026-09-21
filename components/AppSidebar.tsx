"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SidebarUser = { displayName: string | null; email: string | null };

const navItems = [
  {
    href: "/app/locations",
    label: "หอพัก",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    href: "/app/rooms",
    label: "ห้อง",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
    ),
  },
  {
    href: "/app/tenants",
    label: "ผู้เช่า",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: "/app/meter-reading",
    label: "อ่านมิเตอร์",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
    ),
  },
  {
    href: "/app/bills",
    label: "บิลรายเดือน",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<SidebarUser | null>(null);
  const [isTenant, setIsTenant] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.authenticated && data.user) {
          setUser({ displayName: data.user.displayName, email: data.user.email });
          setIsTenant(!!data.user.isTenant);
        }
      })
      .catch(() => {
        // เงียบไว้ — proxy guard จัดการ auth อยู่แล้ว ไม่ redirect/crash
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    // top-level navigation เพื่อให้ browser เดิน redirect chain:
    // ล้าง apt_session -> IdP end-session -> กลับ landing '/'
    window.location.href = "/api/auth/logout";
  };

  return (
    <aside className="sidebar">
      <Link href="/app/locations" className="sidebar-title">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        </svg>
        ระบบจัดการหอพัก
      </Link>
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${isActive ? " active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      {isTenant && (
        <Link
          href="/tenant/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            margin: "0 12px 12px",
            borderRadius: 12,
            textDecoration: "none",
            color: "#3d284c",
            background: "#ffc83d",
            boxShadow: "0 3px 0 #dfad2d",
            border: "1px solid rgba(255,200,61,0.85)",
            fontSize: "0.875rem",
            fontWeight: 800,
            minHeight: 44,
          }}
          aria-label="ไปหน้าผู้เช่า"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
          หน้าผู้เช่า
        </Link>
      )}
      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        {(() => {
          const primary = user?.displayName || user?.email || "บัญชีของฉัน";
          const secondary = user?.displayName ? user.email : null;
          const avatarChar = (primary.trim()[0] || "?").toUpperCase();
          return (
            <div
              title={user?.email || primary}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                marginBottom: 4,
                minWidth: 0,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                {avatarChar}
              </span>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.3 }}>
                <span
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {primary}
                </span>
                {secondary && (
                  <span
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.75rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {secondary}
                  </span>
                )}
              </span>
            </div>
          );
        })()}
        <button
          onClick={handleLogout}
          className="sidebar-item"
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
