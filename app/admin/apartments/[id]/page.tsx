"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type ApartmentDetail = {
  id: number;
  name: string;
  address: string | null;
  createdAt: string;
  owner: {
    id: number;
    displayName: string | null;
    email: string | null;
    role: string;
    status: string;
  };
  subscription: {
    id: number;
    planCode: string;
    planName: string;
    status: string;
    billingCycle: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    pricePerRoom: number | null;
  } | null;
  rooms: Array<{
    id: number;
    roomNumber: string;
    roomType: string;
    baseRent: number;
    tenant: {
      membershipId: number;
      userId: number;
      displayName: string | null;
      email: string | null;
      role: string;
      joinedAt: string;
    } | null;
  }>;
};

export default function ApartmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const apartmentId = params?.id as string;

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apartment, setApartment] = useState<ApartmentDetail | null>(null);

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

  // Fetch apartment detail
  useEffect(() => {
    if (authChecking) return;

    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/apartments/${apartmentId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch apartment: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          setApartment(data.apartment);
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
  }, [authChecking, apartmentId]);

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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  if (authChecking || loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        <div style={{ color: "var(--admin-text-secondary)" }}>
          {authChecking ? "Checking authorization..." : "Loading apartment..."}
        </div>
      </div>
    );
  }

  if (error || !apartment) {
    return (
      <div>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Apartment Not Found</h1>
        </div>
        <div className="admin-error">
          <div className="admin-error-title">Failed to load apartment</div>
          <div className="admin-error-message">{error || "Apartment not found"}</div>
        </div>
        <button
          onClick={() => router.push("/admin/apartments")}
          className="admin-btn admin-btn-secondary"
        >
          Back to Apartments
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => router.push("/admin/apartments")}
            className="admin-btn-icon"
          >
            ← Back
          </button>
          <div>
            <h1 className="admin-page-title">{apartment.name}</h1>
            <p className="admin-page-subtitle">Apartment ID: #{apartment.id}</p>
          </div>
        </div>
      </div>

      {/* Apartment Info Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">Apartment Information</h2>
        <div className="admin-info-grid">
          <div className="admin-info-item">
            <div className="admin-info-label">Name</div>
            <div className="admin-info-value">{apartment.name}</div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Address</div>
            <div className="admin-info-value">{apartment.address || "-"}</div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Total Rooms</div>
            <div className="admin-info-value">{apartment.rooms.length}</div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Created At</div>
            <div className="admin-info-value">{formatDate(apartment.createdAt)}</div>
          </div>
        </div>
      </div>

      {/* Owner Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">Owner</h2>
        <div className="admin-info-grid">
          <div className="admin-info-item">
            <div className="admin-info-label">Name</div>
            <div className="admin-info-value">
              {apartment.owner.displayName || "-"}
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Email</div>
            <div className="admin-info-value">
              {apartment.owner.email || "-"}
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Role</div>
            <div className="admin-info-value">
              <span
                className={`admin-badge ${
                  apartment.owner.role === "SUPER_ADMIN"
                    ? "red"
                    : apartment.owner.role === "PLATFORM_ADMIN"
                    ? "purple"
                    : "blue"
                }`}
              >
                {apartment.owner.role}
              </span>
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">Status</div>
            <div className="admin-info-value">
              <span
                className={`admin-badge ${
                  apartment.owner.status === "ACTIVE" ? "green" : "red"
                }`}
              >
                {apartment.owner.status}
              </span>
            </div>
          </div>
          <div className="admin-info-item">
            <div className="admin-info-label">View User</div>
            <div className="admin-info-value">
              <button
                onClick={() => router.push(`/admin/users/${apartment.owner.id}`)}
                className="admin-btn admin-btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.85rem" }}
              >
                View User #{apartment.owner.id}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">Subscription</h2>
        {apartment.subscription ? (
          <div className="admin-info-grid">
            <div className="admin-info-item">
              <div className="admin-info-label">Plan</div>
              <div className="admin-info-value">
                <span className="admin-badge blue">{apartment.subscription.planCode}</span>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--admin-text-secondary)",
                    marginTop: "4px",
                  }}
                >
                  {apartment.subscription.planName}
                </div>
              </div>
            </div>
            <div className="admin-info-item">
              <div className="admin-info-label">Status</div>
              <div className="admin-info-value">
                <span
                  className={`admin-badge ${
                    apartment.subscription.status === "ACTIVE"
                      ? "green"
                      : apartment.subscription.status === "TRIAL"
                      ? "yellow"
                      : apartment.subscription.status === "EXPIRED"
                      ? "red"
                      : "gray"
                  }`}
                >
                  {apartment.subscription.status}
                </span>
              </div>
            </div>
            <div className="admin-info-item">
              <div className="admin-info-label">Billing Cycle</div>
              <div className="admin-info-value">
                {apartment.subscription.billingCycle || "-"}
              </div>
            </div>
            <div className="admin-info-item">
              <div className="admin-info-label">Price Per Room</div>
              <div className="admin-info-value">
                {formatCurrency(apartment.subscription.pricePerRoom)}
              </div>
            </div>
            {apartment.subscription.trialEndsAt && (
              <div className="admin-info-item">
                <div className="admin-info-label">Trial Ends</div>
                <div className="admin-info-value">
                  {formatDate(apartment.subscription.trialEndsAt)}
                </div>
              </div>
            )}
            {apartment.subscription.currentPeriodStart && (
              <div className="admin-info-item">
                <div className="admin-info-label">Period Start</div>
                <div className="admin-info-value">
                  {formatDate(apartment.subscription.currentPeriodStart)}
                </div>
              </div>
            )}
            {apartment.subscription.currentPeriodEnd && (
              <div className="admin-info-item">
                <div className="admin-info-label">Period End</div>
                <div className="admin-info-value">
                  {formatDate(apartment.subscription.currentPeriodEnd)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="admin-empty-message">No active subscription</div>
        )}
      </div>

      {/* Rooms Section */}
      <div className="admin-card">
        <h2 className="admin-card-title">Rooms ({apartment.rooms.length})</h2>
        {apartment.rooms.length > 0 ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Room Number</th>
                  <th>Type</th>
                  <th>Base Rent</th>
                  <th>Tenant</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {apartment.rooms.map((room) => (
                  <tr key={room.id}>
                    <td>{room.roomNumber}</td>
                    <td>
                      <span className="admin-badge blue">{room.roomType}</span>
                    </td>
                    <td>{formatCurrency(room.baseRent)}</td>
                    <td>
                      {room.tenant ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {room.tenant.displayName || "-"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--admin-text-secondary)",
                            }}
                          >
                            {room.tenant.email || "-"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--admin-text-secondary)",
                              marginTop: "2px",
                            }}
                          >
                            Joined: {formatDate(room.tenant.joinedAt)}
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          room.tenant ? "green" : "gray"
                        }`}
                      >
                        {room.tenant ? "OCCUPIED" : "VACANT"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-message">No rooms</div>
        )}
      </div>
    </div>
  );
}
