"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type SubscriptionDetail = {
  id: number;
  userId: number;
  user: {
    id: number;
    displayName: string | null;
    email: string | null;
  };
  planCode: string;
  plan: {
    code: string;
    name: string;
    roomQuota: number;
  };
  subscriptionStatus: string;
  billingCycle: string | null;
  roomQuotaSnapshot: number;
  currentRoomCount: number;
  trialEndsAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function SubscriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subscriptionId = params?.id as string;

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);

  // Modals
  const [showExtendTrialModal, setShowExtendTrialModal] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [extendDays, setExtendDays] = useState<number>(7);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
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

        setAuthChecking(false);
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  // Fetch subscription detail
  const fetchSubscription = () => {
    if (authChecking) return;

    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/subscriptions/${subscriptionId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch subscription: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          setSubscription(data);
          setSelectedPlan(data.planCode);
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
    fetchSubscription();
  }, [authChecking, subscriptionId]);

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

  const calculateNewExpiryDate = (days: number) => {
    if (!subscription?.trialEndsAt) return "-";
    const currentExpiry = new Date(subscription.trialEndsAt);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + days);
    return formatDate(newExpiry.toISOString());
  };

  const handleExtendTrial = async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}/extend-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: extendDays }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to extend trial");
      }

      setShowExtendTrialModal(false);
      fetchSubscription();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (selectedPlan === subscription?.planCode) {
      setShowChangePlanModal(false);
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: selectedPlan }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to change plan");
      }

      setShowChangePlanModal(false);
      fetchSubscription();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to cancel subscription");
      }

      setShowCancelModal(false);
      fetchSubscription();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (authChecking || loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        <div style={{ color: "var(--admin-text-secondary)" }}>
          {authChecking ? "Checking authorization..." : "Loading subscription..."}
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Subscription Not Found</h1>
        </div>
        <div className="admin-error">
          <div className="admin-error-title">Failed to load subscription</div>
          <div className="admin-error-message">{error || "Subscription not found"}</div>
        </div>
        <button
          onClick={() => router.push("/admin/subscriptions")}
          className="admin-btn admin-btn-secondary"
        >
          Back to Subscriptions
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => router.push("/admin/subscriptions")}
            className="admin-btn-icon"
          >
            ← Back
          </button>
          <div>
            <h1 className="admin-page-title">Subscription #{subscription.id}</h1>
            <p className="admin-page-subtitle">
              {subscription.user.displayName || subscription.user.email}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          {subscription.subscriptionStatus === "TRIAL" && (
            <button
              onClick={() => setShowExtendTrialModal(true)}
              className="admin-btn admin-btn-primary"
            >
              Extend Trial
            </button>
          )}
          <button
            onClick={() => setShowChangePlanModal(true)}
            className="admin-btn admin-btn-secondary"
          >
            Change Plan
          </button>
          {subscription.subscriptionStatus !== "CANCELED" && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="admin-btn admin-btn-danger"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Subscription Info Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">Subscription Information</h2>
        <div className="admin-info-grid">
          <div className="admin-info-item">
            <div className="admin-info-label">Plan</div>
            <div className="admin-info-value">
              <span className="admin-badge blue">{subscription.plan.code}</span>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--admin-text-secondary)",
                  marginTop: "4px",
                }}
              >
                {subscription.plan.name}
              </div>
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Status</div>
            <div className="admin-info-value">
              <span
                className={`admin-badge ${
                  subscription.subscriptionStatus === "ACTIVE"
                    ? "green"
                    : subscription.subscriptionStatus === "TRIAL"
                    ? "yellow"
                    : subscription.subscriptionStatus === "EXPIRED"
                    ? "red"
                    : "gray"
                }`}
              >
                {subscription.subscriptionStatus}
              </span>
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Billing Cycle</div>
            <div className="admin-info-value">
              {subscription.billingCycle || "-"}
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Room Quota</div>
            <div className="admin-info-value">
              {subscription.roomQuotaSnapshot} rooms
            </div>
          </div>
          {subscription.trialEndsAt && (
            <div className="admin-info-item">
              <div className="admin-info-label">Trial Ends</div>
              <div className="admin-info-value">
                {formatDate(subscription.trialEndsAt)}
              </div>
            </div>
          )}
          {subscription.periodStart && (
            <div className="admin-info-item">
              <div className="admin-info-label">Period Start</div>
              <div className="admin-info-value">
                {formatDate(subscription.periodStart)}
              </div>
            </div>
          )}
          {subscription.periodEnd && (
            <div className="admin-info-item">
              <div className="admin-info-label">Period End</div>
              <div className="admin-info-value">
                {formatDate(subscription.periodEnd)}
              </div>
            </div>
          )}
          {subscription.canceledAt && (
            <div className="admin-info-item">
              <div className="admin-info-label">Canceled At</div>
              <div className="admin-info-value">
                {formatDate(subscription.canceledAt)}
              </div>
            </div>
          )}
          <div className="admin-info-item">
            <div className="admin-info-label">Created At</div>
            <div className="admin-info-value">
              {formatDate(subscription.createdAt)}
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Updated At</div>
            <div className="admin-info-value">
              {formatDate(subscription.updatedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">User</h2>
        <div className="admin-info-grid">
          <div className="admin-info-item">
            <div className="admin-info-label">User ID</div>
            <div className="admin-info-value">
              <button
                onClick={() => router.push(`/admin/users/${subscription.user.id}`)}
                className="admin-btn admin-btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.85rem" }}
              >
                View User #{subscription.user.id}
              </button>
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Display Name</div>
            <div className="admin-info-value">
              {subscription.user.displayName || "-"}
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Email</div>
            <div className="admin-info-value">
              {subscription.user.email || "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Room Usage Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">Room Usage</h2>
        <div className="admin-info-grid">
          <div className="admin-info-item">
            <div className="admin-info-label">Current Room Count</div>
            <div className="admin-info-value">
              {subscription.currentRoomCount}
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Room Quota</div>
            <div className="admin-info-value">
              {subscription.roomQuotaSnapshot}
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Usage</div>
            <div className="admin-info-value">
              <span
                style={{
                  color:
                    subscription.currentRoomCount > subscription.roomQuotaSnapshot
                      ? "var(--admin-error)"
                      : subscription.currentRoomCount === subscription.roomQuotaSnapshot
                      ? "var(--admin-warning)"
                      : "var(--admin-success)",
                }}
              >
                {Math.round(
                  (subscription.currentRoomCount / subscription.roomQuotaSnapshot) * 100
                )}
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Extend Trial Modal */}
      {showExtendTrialModal && (
        <div className="admin-modal-overlay" onClick={() => setShowExtendTrialModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Extend Trial</h3>
              <button
                className="admin-modal-close"
                onClick={() => setShowExtendTrialModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <div style={{ marginBottom: "20px" }}>
                <label className="admin-label">Quick Select</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setExtendDays(days)}
                      className={`admin-btn ${
                        extendDays === days ? "admin-btn-primary" : "admin-btn-secondary"
                      }`}
                      style={{ padding: "8px 16px" }}
                    >
                      +{days} days
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label className="admin-label">Custom Days</label>
                <input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                  className="admin-search-input"
                  min="1"
                  max="365"
                  placeholder="Enter days"
                />
              </div>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "var(--admin-bg-dark)",
                  borderRadius: "8px",
                  border: "1px solid var(--admin-border)",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "var(--admin-text-secondary)" }}>
                  Current Expiry
                </div>
                <div style={{ fontWeight: 600, marginBottom: "8px" }}>
                  {formatDate(subscription.trialEndsAt)}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--admin-text-secondary)" }}>
                  New Expiry
                </div>
                <div style={{ fontWeight: 600, color: "var(--admin-success)" }}>
                  {calculateNewExpiryDate(extendDays)}
                </div>
              </div>
              {actionError && (
                <div className="admin-error" style={{ marginTop: "16px" }}>
                  <div className="admin-error-message">{actionError}</div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button
                onClick={() => setShowExtendTrialModal(false)}
                className="admin-btn admin-btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleExtendTrial}
                className="admin-btn admin-btn-primary"
                disabled={actionLoading || extendDays <= 0}
              >
                {actionLoading ? "Extending..." : `Extend by ${extendDays} days`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {showChangePlanModal && (
        <div className="admin-modal-overlay" onClick={() => setShowChangePlanModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Change Plan</h3>
              <button
                className="admin-modal-close"
                onClick={() => setShowChangePlanModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <div style={{ marginBottom: "16px" }}>
                <label className="admin-label">Select New Plan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="admin-select"
                  style={{ width: "100%" }}
                >
                  <option value="TRIAL">Trial</option>
                  <option value="STARTER">Starter</option>
                  <option value="STANDARD">Standard</option>
                  <option value="PRO">Pro</option>
                </select>
              </div>
              {selectedPlan !== subscription.planCode && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "var(--admin-bg-dark)",
                    borderRadius: "8px",
                    border: "1px solid var(--admin-border)",
                  }}
                >
                  <div style={{ fontSize: "0.85rem", color: "var(--admin-text-secondary)" }}>
                    Current Plan: <strong>{subscription.plan.code}</strong>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--admin-text-secondary)" }}>
                    New Plan: <strong>{selectedPlan}</strong>
                  </div>
                </div>
              )}
              {actionError && (
                <div className="admin-error" style={{ marginTop: "16px" }}>
                  <div className="admin-error-message">{actionError}</div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button
                onClick={() => setShowChangePlanModal(false)}
                className="admin-btn admin-btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePlan}
                className="admin-btn admin-btn-primary"
                disabled={actionLoading || selectedPlan === subscription.planCode}
              >
                {actionLoading ? "Changing..." : "Change Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Cancel Subscription</h3>
              <button
                className="admin-modal-close"
                onClick={() => setShowCancelModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Are you sure you want to cancel this subscription? This action cannot be undone.
              </p>
              {actionError && (
                <div className="admin-error" style={{ marginTop: "16px" }}>
                  <div className="admin-error-message">{actionError}</div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button
                onClick={() => setShowCancelModal(false)}
                className="admin-btn admin-btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCancelSubscription}
                className="admin-btn admin-btn-danger"
                disabled={actionLoading}
              >
                {actionLoading ? "Canceling..." : "Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
