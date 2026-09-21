"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  displayName: string | null;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  subscription: {
    planCode: string;
    subscriptionStatus: string;
  } | null;
  apartmentCount: number;
  roomCount: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

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
          router.replace("/app");
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

  // Fetch users
  useEffect(() => {
    if (authChecking) return;

    let active = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
    });

    if (search) params.set("search", search);
    if (subscriptionStatus) params.set("subscriptionStatus", subscriptionStatus);
    if (planCode) params.set("planCode", planCode);
    if (role) params.set("role", role);
    if (status) params.set("status", status);

    fetch(`/api/admin/users?${params}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch users: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          setUsers(data.users);
          setPagination(data.pagination);
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
  }, [authChecking, pagination.page, search, subscriptionStatus, planCode, role, status]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSubscriptionBadge = (sub: User["subscription"]) => {
    if (!sub) return <span className="admin-badge gray">No Subscription</span>;
    
    const statusColors: Record<string, string> = {
      TRIAL: "yellow",
      ACTIVE: "green",
      EXPIRED: "red",
      CANCELED: "gray",
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span className={`admin-badge ${statusColors[sub.subscriptionStatus] || "gray"}`}>
          {sub.planCode}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--admin-text-secondary)" }}>
          {sub.subscriptionStatus}
        </span>
      </div>
    );
  };

  const getRoleBadge = (roleValue: string) => {
    const colors: Record<string, string> = {
      USER: "blue",
      PLATFORM_ADMIN: "purple",
      SUPER_ADMIN: "red",
    };
    return <span className={`admin-badge ${colors[roleValue] || "gray"}`}>{roleValue}</span>;
  };

  const getStatusBadge = (statusValue: string) => {
    return (
      <span className={`admin-badge ${statusValue === "ACTIVE" ? "green" : "red"}`}>
        {statusValue}
      </span>
    );
  };

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

  if (error && !loading) {
    return (
      <div>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-subtitle">
            Manage users, roles, and account status
          </p>
        </div>
        <div className="admin-error">
          <div className="admin-error-title">Failed to load users</div>
          <div className="admin-error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Users</h1>
        <p className="admin-page-subtitle">
          Manage users, roles, and account status
        </p>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <form onSubmit={handleSearch} className="admin-search-form">
          <input
            type="text"
            placeholder="Search by ID, email, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
          <button type="submit" className="admin-btn admin-btn-primary">
            Search
          </button>
        </form>

        <div className="admin-filter-row">
          <select
            value={subscriptionStatus}
            onChange={(e) => {
              setSubscriptionStatus(e.target.value);
              handleFilterChange();
            }}
            className="admin-select"
          >
            <option value="">All Subscriptions</option>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELED">Canceled</option>
            <option value="NONE">No Subscription</option>
          </select>

          <select
            value={planCode}
            onChange={(e) => {
              setPlanCode(e.target.value);
              handleFilterChange();
            }}
            className="admin-select"
          >
            <option value="">All Plans</option>
            <option value="TRIAL">Trial</option>
            <option value="STARTER">Starter</option>
            <option value="STANDARD">Standard</option>
            <option value="PRO">Pro</option>
          </select>

          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              handleFilterChange();
            }}
            className="admin-select"
          >
            <option value="">All Roles</option>
            <option value="USER">User</option>
            <option value="PLATFORM_ADMIN">Platform Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              handleFilterChange();
            }}
            className="admin-select"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {(search || subscriptionStatus || planCode || role || status) && (
            <button
              onClick={() => {
                setSearch("");
                setSubscriptionStatus("");
                setPlanCode("");
                setRole("");
                setStatus("");
                handleFilterChange();
              }}
              className="admin-btn admin-btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results summary */}
      <div className="admin-results-summary">
        Showing {users.length} of {pagination.total} users
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
          <div style={{ color: "var(--admin-text-secondary)" }}>
            Loading users...
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">👤</div>
          <div className="admin-empty-title">No users found</div>
          <div className="admin-empty-message">
            {search || subscriptionStatus || planCode || role || status
              ? "Try adjusting your filters"
              : "No users in the system yet"}
          </div>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Subscription</th>
                  <th>Apartments</th>
                  <th>Rooms</th>
                  <th>Created</th>
                  <th>Last Login</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className="admin-table-row-clickable"
                  >
                    <td>#{user.id}</td>
                    <td>{user.displayName || "-"}</td>
                    <td>{user.email || "-"}</td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>{getSubscriptionBadge(user.subscription)}</td>
                    <td>{user.apartmentCount}</td>
                    <td>{user.roomCount}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>{formatDate(user.lastLoginAt)}</td>
                    <td>{getStatusBadge(user.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="admin-pagination">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
                className="admin-btn admin-btn-secondary"
              >
                Previous
              </button>
              <div className="admin-pagination-info">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page === pagination.totalPages}
                className="admin-btn admin-btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
