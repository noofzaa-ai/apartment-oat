"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminNotes from "../../components/AdminNotes";

type UserDetail = {
  id: number;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  externalIdentity: {
    issuer: string;
    subject: string;
  } | null;
  subscription: {
    id: number;
    planCode: string;
    subscriptionStatus: string;
    billingCycle: string | null;
    trialEndsAt: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    roomQuotaSnapshot: number;
  } | null;
  apartments: Array<{
    id: number;
    name: string;
    address: string | null;
    roomCount: number;
    createdAt: string;
  }>;
  memberships: Array<{
    id: number;
    apartmentId: number;
    apartmentName: string;
    role: string;
    roomNumber: string | null;
    createdAt: string;
  }>;
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [authChecking, setAuthChecking] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);

  // Modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

        setCurrentUserRole(userRole);
        setAuthChecking(false);
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  // Fetch user detail
  const fetchUser = () => {
    if (authChecking) return;

    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/users/${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch user: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          setUser(data);
          setSelectedRole(data.role);
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
    fetchUser();
  }, [authChecking, userId]);

  const handleSuspendToggle = async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to toggle suspend status");
      }

      setShowSuspendModal(false);
      fetchUser();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleUpdate = async () => {
    if (selectedRole === user?.role) {
      setShowRoleModal(false);
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update role");
      }

      setShowRoleModal(false);
      fetchUser();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authChecking || loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        <div style={{ color: "var(--admin-text-secondary)" }}>
          {authChecking ? "Checking authorization..." : "Loading user..."}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <div className="admin-page-header">
          <h1 className="admin-page-title">User Not Found</h1>
        </div>
        <div className="admin-error">
          <div className="admin-error-title">Failed to load user</div>
          <div className="admin-error-message">{error || "User not found"}</div>
        </div>
        <button
          onClick={() => router.push("/admin/users")}
          className="admin-btn admin-btn-secondary"
        >
          Back to Users
        </button>
      </div>
    );
  }

  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  return (
    <div>
      <div className="admin-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => router.push("/admin/users")}
            className="admin-btn-icon"
          >
            ← Back
          </button>
          <div>
            <h1 className="admin-page-title">
              {user.displayName || user.email || `User #${user.id}`}
            </h1>
            <p className="admin-page-subtitle">User ID: #{user.id}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button
            onClick={() => setShowSuspendModal(true)}
            className={`admin-btn ${
              user.status === "ACTIVE" ? "admin-btn-danger" : "admin-btn-success"
            }`}
          >
            {user.status === "ACTIVE" ? "Suspend User" : "Unsuspend User"}
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setShowRoleModal(true)}
              className="admin-btn admin-btn-secondary"
            >
              Edit Role
            </button>
          )}
        </div>
      </div>

      {/* User Info Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">User Information</h2>
        <div className="admin-info-grid">
          <div className="admin-info-item">
            <div className="admin-info-label">Display Name</div>
            <div className="admin-info-value">{user.displayName || "-"}</div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Email</div>
            <div className="admin-info-value">
              {user.email || "-"}
              {user.emailVerified && (
                <span className="admin-badge green" style={{ marginLeft: "8px" }}>
                  Verified
                </span>
              )}
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Role</div>
            <div className="admin-info-value">
              <span
                className={`admin-badge ${
                  user.role === "SUPER_ADMIN"
                    ? "red"
                    : user.role === "PLATFORM_ADMIN"
                    ? "purple"
                    : "blue"
                }`}
              >
                {user.role}
              </span>
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Status</div>
            <div className="admin-info-value">
              <span
                className={`admin-badge ${
                  user.status === "ACTIVE" ? "green" : "red"
                }`}
              >
                {user.status}
              </span>
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Created At</div>
            <div className="admin-info-value">{formatDate(user.createdAt)}</div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Last Login</div>
            <div className="admin-info-value">{formatDate(user.lastLoginAt)}</div>
          </div>
          {user.externalIdentity && (
            <>
              <div className="admin-info-item">
                <div className="admin-info-label">External Issuer</div>
                <div className="admin-info-value">{user.externalIdentity.issuer}</div>
              </div>
              <div className="admin-info-item">
                <div className="admin-info-label">External Subject</div>
                <div className="admin-info-value" style={{ wordBreak: "break-all" }}>
                  {user.externalIdentity.subject}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Subscription Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">Subscription</h2>
        {user.subscription ? (
          <div className="admin-info-grid">
            <div className="admin-info-item">
              <div className="admin-info-label">Plan</div>
              <div className="admin-info-value">
                <span className="admin-badge blue">{user.subscription.planCode}</span>
              </div>
            </div>
            <div className="admin-info-item">
              <div className="admin-info-label">Status</div>
              <div className="admin-info-value">
                <span
                  className={`admin-badge ${
                    user.subscription.subscriptionStatus === "ACTIVE"
                      ? "green"
                      : user.subscription.subscriptionStatus === "TRIAL"
                      ? "yellow"
                      : "red"
                  }`}
                >
                  {user.subscription.subscriptionStatus}
                </span>
              </div>
            </div>
            <div className="admin-info-item">
              <div className="admin-info-label">Billing Cycle</div>
              <div className="admin-info-value">
                {user.subscription.billingCycle || "-"}
              </div>
            </div>
            <div className="admin-info-item">
              <div className="admin-info-label">Room Quota</div>
              <div className="admin-info-value">
                {user.subscription.roomQuotaSnapshot} rooms
              </div>
            </div>
            {user.subscription.trialEndsAt && (
              <div className="admin-info-item">
                <div className="admin-info-label">Trial Ends</div>
                <div className="admin-info-value">
                  {formatDate(user.subscription.trialEndsAt)}
                </div>
              </div>
            )}
            {user.subscription.periodStart && (
              <div className="admin-info-item">
                <div className="admin-info-label">Period Start</div>
                <div className="admin-info-value">
                  {formatDate(user.subscription.periodStart)}
                </div>
              </div>
            )}
            {user.subscription.periodEnd && (
              <div className="admin-info-item">
                <div className="admin-info-label">Period End</div>
                <div className="admin-info-value">
                  {formatDate(user.subscription.periodEnd)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="admin-empty-message">No active subscription</div>
        )}
      </div>

      {/* Apartments Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">
          Apartments Owned ({user.apartments.length})
        </h2>
        {user.apartments.length > 0 ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Rooms</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {user.apartments.map((apt) => (
                  <tr key={apt.id}>
                    <td>#{apt.id}</td>
                    <td>{apt.name}</td>
                    <td>{apt.address || "-"}</td>
                    <td>{apt.roomCount}</td>
                    <td>{formatDate(apt.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-message">No apartments owned</div>
        )}
      </div>

      {/* Memberships Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">
          Memberships ({user.memberships.length})
        </h2>
        {user.memberships.length > 0 ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Apartment</th>
                  <th>Role</th>
                  <th>Room</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {user.memberships.map((membership) => (
                  <tr key={membership.id}>
                    <td>{membership.apartmentName}</td>
                    <td>
                      <span
                        className={`admin-badge ${
                          membership.role === "OWNER" ? "purple" : "blue"
                        }`}
                      >
                        {membership.role}
                      </span>
                    </td>
                    <td>{membership.roomNumber || "-"}</td>
                    <td>{formatDate(membership.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-message">No memberships</div>
        )}
      </div>

      {/* Admin Notes Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">Admin Notes</h2>
        <AdminNotes userId={user.id} />
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="admin-modal-overlay" onClick={() => setShowSuspendModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {user.status === "ACTIVE" ? "Suspend User" : "Unsuspend User"}
              </h3>
              <button
                className="admin-modal-close"
                onClick={() => setShowSuspendModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                {user.status === "ACTIVE"
                  ? "Are you sure you want to suspend this user? They will be blocked from login and their data will be hidden."
                  : "Are you sure you want to unsuspend this user? They will be able to login again."}
              </p>
              {actionError && (
                <div className="admin-error" style={{ marginTop: "16px" }}>
                  <div className="admin-error-message">{actionError}</div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="admin-btn admin-btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendToggle}
                className={`admin-btn ${
                  user.status === "ACTIVE" ? "admin-btn-danger" : "admin-btn-success"
                }`}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Processing..."
                  : user.status === "ACTIVE"
                  ? "Suspend"
                  : "Unsuspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Edit Modal */}
      {showRoleModal && (
        <div className="admin-modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Edit User Role</h3>
              <button
                className="admin-modal-close"
                onClick={() => setShowRoleModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <div style={{ marginBottom: "16px" }}>
                <label className="admin-label">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="admin-select"
                >
                  <option value="USER">USER</option>
                  <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
              {actionError && (
                <div className="admin-error">
                  <div className="admin-error-message">{actionError}</div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button
                onClick={() => setShowRoleModal(false)}
                className="admin-btn admin-btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleRoleUpdate}
                className="admin-btn admin-btn-primary"
                disabled={actionLoading || selectedRole === user.role}
              >
                {actionLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
