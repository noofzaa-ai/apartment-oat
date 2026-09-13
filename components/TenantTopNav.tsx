"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function TenantTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [roomNumber, setRoomNumber] = useState<string | null>(null);

  useEffect(() => {
    // Fetch minimal tenant info for the room chip
    fetch("/api/tenant/bill")
      .then((r) => r.json())
      .then((d) => {
        if (d.room) setRoomNumber(d.room.roomNumber);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/tenant/login");
  };

  const navLinks = [
    {
      href: "/tenant/dashboard",
      label: "หน้าหลัก",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: "/tenant/payment",
      label: "แจ้งชำระ",
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
        background: "#1E293B",
        height: 60,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
      }}
      role="navigation"
      aria-label="เมนูหลักผู้เช่า"
    >
      {/* Logo */}
      <Link
        href="/tenant/dashboard"
        style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", flexShrink: 0 }}
      >
        <div
          style={{
            width: 32, height: 32, background: "#2D5BE3", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" fill="white">
            <path d="M10 1L2 8v11h5v-7h6v7h5V8L10 1z" />
          </svg>
        </div>
        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "white" }}>ApartmentOAT</span>
      </Link>

      {/* Room chip */}
      {roomNumber && (
        <span
          style={{
            padding: "4px 12px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: 9999,
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.8)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          ห้อง {roomNumber}
        </span>
      )}

      {/* Nav links — pushed right */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
        {navLinks.map((link) => {
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
                borderRadius: 8,
                textDecoration: "none",
                color: isActive ? "white" : "rgba(255,255,255,0.6)",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                fontSize: "0.8125rem",
                fontWeight: isActive ? 600 : 500,
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
        }
      `}</style>
    </nav>
  );
}
