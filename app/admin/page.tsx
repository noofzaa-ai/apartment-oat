"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DashboardStats = {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  totalApartments: number;
  totalRooms: number;
  mrr: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check admin authorization
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
          // Not authorized - redirect to get-started
          router.replace("/get-started");
          return;
        }

        setAuthChecking(false);
      })
      .catch(() => {
        if (active) {
          router.replace("/login");
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  // Fetch dashboard stats
  useEffect(() => {
    if (authChecking) return;

    let active = true;
    fetch("/api/admin/dashboard/stats")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch stats: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authChecking]);

  if (authChecking || loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        <div style={{ color: "var(--admin-text-secondary)" }}>
          {authChecking ? "Checking authorization..." : "Loading dashboard..."}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Platform overview and key metrics</p>
        </div>
        <div className="admin-error">
          <div className="admin-error-title">Failed to load dashboard</div>
          <div className="admin-error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="admin-error">
        <div className="admin-error-title">No data available</div>
        <div className="admin-error-message">Unable to load dashboard statistics</div>
      </div>
    );
  }

  const metrics = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: "👥",
      color: "blue",
    },
    {
      label: "Active Subscriptions",
      value: stats.activeSubscriptions.toLocaleString(),
      icon: "✅",
      color: "green",
    },
    {
      label: "Trial Users",
      value: stats.trialUsers.toLocaleString(),
      icon: "🔔",
      color: "yellow",
    },
    {
      label: "Total Apartments",
      value: stats.totalApartments.toLocaleString(),
      icon: "🏢",
      color: "purple",
    },
    {
      label: "Total Rooms",
      value: stats.totalRooms.toLocaleString(),
      icon: "🚪",
      color: "blue",
    },
    {
      label: "MRR",
      value: `฿${stats.mrr.toLocaleString()}`,
      icon: "💰",
      color: "green",
    },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-subtitle">
          Platform overview and key metrics
        </p>
      </div>

      <div className="admin-metrics-grid">
        {metrics.map((metric) => (
          <div key={metric.label} className="admin-metric-card">
            <div className="admin-metric-header">
              <div className="admin-metric-label">{metric.label}</div>
              <div className={`admin-metric-icon ${metric.color}`}>
                {metric.icon}
              </div>
            </div>
            <div className="admin-metric-value">{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
