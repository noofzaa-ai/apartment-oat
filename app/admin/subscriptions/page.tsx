"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Subscription = {
  id: number;
  userId: number;
  user: {
    displayName: string | null;
    email: string | null;
  };
  plan: {
    code: string;
    name: string;
  };
  subscriptionStatus: string;
  billingCycle: string | null;
  currentRoomCount: number;
  roomQuotaSnapshot: number;
  mrr: number;
  periodStart: string | null;
  periodEnd: string | null;
  daysLeft: number | null;
};

type Filters = {
  plan: string;
  status: string;
  billingCycle: string;
  expiringDays: string;
  page: number;
};

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    plan: "all",
    status: "all",
    billingCycle: "all",
    expiringDays: "",
    page: 1,
  });

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

  // Fetch subscriptions
  const fetchSubscriptions = () => {
    if (authChecking) return;

    let active = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.append("page", filters.page.toString());
    params.append("limit", "25");
    if (filters.plan !== "all") params.append("plan", filters.plan);
    if (filters.status !== "all") params.append("status", filters.status);
    if (filters.billingCycle !== "all") params.append("billingCycle", filters.billingCycle);
    if (filters.expiringDays) params.append("expiringDays", filters.expiringDays);

    fetch(`/api/admin/subscriptions?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch subscriptions: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          setSubscriptions(data.subscriptions || []);
          setTotal(data.total || 0);
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
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [authChecking, filters]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleFilterChange = (key: keyof Filters, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? (value as number) : 1, // Reset to page 1 when changing filters
    }));
  };

  const totalPages = Math.ceil(total / 25);

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
        <h1 className="admin-page-title">Subscriptions</h1>
        <p className="admin-page-subtitle">
          Manage user subscriptions and billing
        </p>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-row">
          <select
            value={filters.plan}
            onChange={(e) => handleFilterChange("plan", e.target.value)}
            className="admin-select"
          >
            <option value="all">All Plans</option>
            <option value="TRIAL">Trial</option>
            <option value="STARTER">Starter</option>
            <option value="STANDARD">Standard</option>
            <option value="PRO">Pro</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="admin-select"
          >
            <option value="all">All Statuses</option>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELED">Canceled</option>
          </select>

          <select
            value={filters.billingCycle}
            onChange={(e) => handleFilterChange("billingCycle", e.target.value)}
            className="admin-select"
          >
            <option value="all">All Billing Cycles</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>

          <select
            value={filters.expiringDays}
            onChange={(e) => handleFilterChange("expiringDays", e.target.value)}
            className="admin-select"
          >
            <option value="">Expiring Soon</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
          <div style={{ color: "var(--admin-text-secondary)" }}>
            Loading subscriptions...
          </div>
        </div>
      ) : error ? (
        <div className="admin-error">
          <div className="admin-error-title">Failed to load subscriptions</div>
          <div className="admin-error-message">{error}</div>
        </div>
      ) : (
        <>
          <div className="admin-results-summary">
            Showing {subscriptions.length} of {total} subscriptions
          </div>

          {subscriptions.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">📋</div>
              <div className="admin-empty-title">No subscriptions found</div>
              <div className="admin-empty-message">
                Try adjusting your filters or check back later.
              </div>
            </div>
          ) : (
            <>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Billing</th>
                      <th>Rooms</th>
                      <th>MRR</th>
                      <th>Period Start</th>
                      <th>Period End</th>
                      <th>Days Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="admin-table-row-clickable"
                        onClick={() => router.push(`/admin/subscriptions/${sub.id}`)}
                      >
                        <td>#{sub.id}</td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {sub.user.displayName || "Unnamed"}
                            </div>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--admin-text-secondary)",
                              }}
                            >
                              {sub.user.email}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span className="admin-badge blue">{sub.plan.code}</span>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--admin-text-secondary)",
                                marginTop: "4px",
                              }}
                            >
                              {sub.plan.name}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`admin-badge ${
                              sub.subscriptionStatus === "ACTIVE"
                                ? "green"
                                : sub.subscriptionStatus === "TRIAL"
                                ? "yellow"
                                : sub.subscriptionStatus === "EXPIRED"
                                ? "red"
                                : "gray"
                            }`}
                          >
                            {sub.subscriptionStatus}
                          </span>
                        </td>
                        <td>{sub.billingCycle || "-"}</td>
                        <td>
                          {sub.currentRoomCount} / {sub.roomQuotaSnapshot}
                        </td>
                        <td>฿{sub.mrr.toLocaleString()}</td>
                        <td>{formatDate(sub.periodStart)}</td>
                        <td>{formatDate(sub.periodEnd)}</td>
                        <td>
                          {sub.daysLeft !== null ? (
                            <span
                              style={{
                                color:
                                  sub.daysLeft <= 7
                                    ? "var(--admin-error)"
                                    : sub.daysLeft <= 14
                                    ? "var(--admin-warning)"
                                    : "var(--admin-text-primary)",
                              }}
                            >
                              {sub.daysLeft} days
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    onClick={() => handleFilterChange("page", filters.page - 1)}
                    disabled={filters.page === 1}
                    className="admin-btn admin-btn-secondary"
                  >
                    Previous
                  </button>
                  <div className="admin-pagination-info">
                    Page {filters.page} of {totalPages}
                  </div>
                  <button
                    onClick={() => handleFilterChange("page", filters.page + 1)}
                    disabled={filters.page === totalPages}
                    className="admin-btn admin-btn-secondary"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
