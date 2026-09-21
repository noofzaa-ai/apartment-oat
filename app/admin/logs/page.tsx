"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        
        if (!data?.authenticated) {
          router.replace("/login");
          return;
        }

        const userRole = data.user?.role;
        if (userRole !== "PLATFORM_ADMIN" && userRole !== "SUPER_ADMIN") {
          router.replace("/get-started");
          return;
        }

        setAuthChecking(false);
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (authChecking) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        <div style={{ color: "var(--admin-text-secondary)" }}>
          Checking authorization...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Audit Logs</h1>
        <p className="admin-page-subtitle">
          View system activity, admin actions, and security events
        </p>
      </div>
      <div className="admin-error" style={{ background: "var(--admin-surface)", border: "1px solid var(--admin-border)" }}>
        <div className="admin-error-title" style={{ color: "var(--admin-text-primary)" }}>Coming Soon</div>
        <div className="admin-error-message">Audit log interface will be available in Phase 5</div>
      </div>
    </div>
  );
}
