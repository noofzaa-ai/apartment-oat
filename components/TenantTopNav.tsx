"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type TenantUser = { email: string | null; displayName: string | null };

export default function TenantTopNav() {
  const pathname = usePathname();
  const [roomNumber, setRoomNumber] = useState<string | null>(null);
  const [user, setUser] = useState<TenantUser | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    // Fetch tenant info for the room chip and user email
    fetch("/api/tenant/bill")
      .then((r) => r.json())
      .then((d) => {
        if (d.room) setRoomNumber(d.room.roomNumber);
        if (d.tenant) setUser({ email: d.tenant.email, displayName: d.tenant.name });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Fetch /api/me to check if user also has owner subscription
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user && d.user.isOwner) setIsOwner(true);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    // top-level navigation: ล้าง apt_session -> IdP end-session -> กลับ landing '/'
    window.location.href = "/api/auth/logout";
  };

  const navLinks = [
    {
      href: "/tenant/dashboard",
      label: "หน้าหลัก",
      requireRoom: false,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: "/tenant/payment",
      label: "แจ้งชำระ",
      requireRoom: true, // จะแสดงก็ต่อเมื่อมี roomNumber
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
    {
      href: "/tenant/history",
      label: "ประวัติ",
      requireRoom: true, // จะแสดงก็ต่อเมื่อมี roomNumber
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      style={{
        background: "var(--brand-purple, #3d284c)",
        height: 60,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 14px rgba(61,40,76,0.18)",
      }}
      role="navigation"
      aria-label="เมนูหลักผู้เช่า"
    >
      {/* Logo */}
      <Link
        href="/tenant/dashboard"
        style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}
      >
        <div
          style={{
            width: 32, height: 32, background: "#ffc83d", borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 3px 0 #e7a91a", color: "#3d284c", fontSize: "1rem", fontWeight: 800,
          }}
        >
          ✦
        </div>
        <span style={{ fontSize: "0.9375rem", fontWeight: 800, color: "white", letterSpacing: "-0.04em", fontFamily: "'DM Sans', sans-serif" }}>
          apartments<span style={{ color: "#ffc83d" }}>.</span>
        </span>
      </Link>

      {/* Room chip */}
      {roomNumber && (
        <span
          style={{
            padding: "4px 12px",
            background: "rgba(255,200,61,0.16)",
            borderRadius: 9999,
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#ffd980",
            border: "1px solid rgba(255,200,61,0.3)",
          }}
        >
          ห้อง {roomNumber}
        </span>
      )}

      {/* Nav links — pushed right */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
        {navLinks
          .filter((link) => !link.requireRoom || roomNumber !== null)
          .map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 9999,
                  textDecoration: "none",
                  color: isActive ? "#3d284c" : "rgba(255,255,255,0.72)",
                  background: isActive ? "#ffc83d" : "transparent",
                  fontSize: "0.8125rem",
                  fontWeight: isActive ? 700 : 500,
                  minHeight: 40,
                  transition: "background-color 120ms ease, color 120ms ease",
                }}
                aria-current={isActive ? "page" : undefined}
              >
                {link.icon}
                <span className="topnav-link-label">{link.label}</span>
              </Link>
            );
          })}

        {isOwner && (
          <Link
            href="/app/locations"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              marginLeft: 8,
              borderRadius: 9999,
              textDecoration: "none",
              color: "#3d284c",
              background: "#ffc83d",
              boxShadow: "0 3px 0 #dfad2d",
              border: "1px solid rgba(255,200,61,0.85)",
              fontSize: "0.8125rem",
              fontWeight: 800,
              minHeight: 40,
              transition: "transform 120ms ease, box-shadow 120ms ease",
            }}
            aria-label="ไปหน้าเจ้าของหอ"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.85">
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-6h6v6" />
              <path d="M9 10h.01M15 10h.01" />
            </svg>
            <span className="owner-switch-label">หน้าเจ้าของหอ</span>
          </Link>
        )}

        {/* User email display */}
        {user?.email && (
          <div
            title={user.email}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              marginLeft: 8,
              borderRadius: 9999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(255,200,61,0.2)",
                color: "#ffd980",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {(user.displayName || user.email || "?")[0].toUpperCase()}
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 180,
              }}
              className="tenant-user-email"
            >
              {user.email}
            </span>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          aria-label="ออกจากระบบ"
          style={{
            width: 36, height: 36,
            background: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginLeft: 8,
            transition: "background-color 120ms ease, color 120ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLButtonElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      <style>{`
        @media (max-width: 560px) {
          .topnav-link-label { display: none; }
          .tenant-user-email { display: none; }
          .owner-switch-label { display: none; }
        }
      `}</style>
    </nav>
  );
}
