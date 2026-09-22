"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Apartment = {
  id: number;
  name: string;
  address: string;
  createdAt: string;
  owner: {
    id: number;
    displayName: string | null;
    email: string | null;
  };
  subscription: {
    planCode: string;
    planName: string;
    status: string;
  } | null;
  roomCount: number;
  occupiedRoomCount: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function AdminApartmentsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");

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

  // Fetch apartments
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
    if (planCode) params.set("planCode", planCode);
    if (subscriptionStatus) params.set("subscriptionStatus", subscriptionStatus);

    fetch(`/api/admin/apartments?${params}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch apartments: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          setApartments(data.apartments);
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
  }, [authChecking, pagination.page, pagination.limit, search, planCode, subscriptionStatus]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSubscriptionBadge = (sub: Apartment["subscription"]) => {
    if (!sub) return <span className="admin-badge gray">No Subscription</span>;

    const statusColors: Record<string, string> = {
      TRIAL: "yellow",
      ACTIVE: "green",
      EXPIRED: "red",
      CANCELED: "gray",
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span className={`admin-badge ${statusColors[sub.status] || "gray"}`}>
          {sub.planCode}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--admin-text-secondary)" }}>
          {sub.planName}
        </span>
      </div>
    );
  };

  const getOccupancyColor = (occupied: number, total: number) => {
    if (total === 0) return "var(--admin-text-secondary)";
    const ratio = occupied / total;
    if (ratio >= 0.9) return "var(--admin-error)";
    if (ratio >= 0.7) return "var(--admin-warning)";
    return "var(--admin-success)";
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
          <h1 className="admin-page-title">Apartments</h1>
          <p className="admin-page-subtitle">
            Manage apartments, rooms, and ownership
          </p>
        </div>
        <div className="admin-error">
          <div className="admin-error-title">Failed to load apartments</div>
          <div className="admin-error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Apartments</h1>
        <p className="admin-page-subtitle">
          Manage apartments, rooms, and ownership
        </p>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <form onSubmit={handleSearch} className="admin-search-form">
          <input
            type="text"
            placeholder="Search by apartment name or owner email..."
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
            value={subscriptionStatus}
            onChange={(e) => {
              setSubscriptionStatus(e.target.value);
              handleFilterChange();
            }}
            className="admin-select"
          >
            <option value="">All Subscription Statuses</option>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELED">Canceled</option>
            <option value="NONE">No Subscription</option>
          </select>

          <select
            value={pagination.limit}
            onChange={(e) => {
              setPagination((prev) => ({
                ...prev,
                limit: parseInt(e.target.value),
                page: 1,
              }));
            }}
            className="admin-select"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>

          {(search || planCode || subscriptionStatus) && (
            <button
              onClick={() => {
                setSearch("");
                setPlanCode("");
                setSubscriptionStatus("");
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
        Showing {apartments.length} of {pagination.total} apartments
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
          <div style={{ color: "var(--admin-text-secondary)" }}>
            Loading apartments...
          </div>
        </div>
      ) : apartments.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">🏢</div>
          <div className="admin-empty-title">No apartments found</div>
          <div className="admin-empty-message">
            {search || planCode || subscriptionStatus
              ? "Try adjusting your filters"
              : "No apartments in the system yet"}
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
                  <th>Address</th>
                  <th>Owner</th>
                  <th>Subscription</th>
                  <th>Rooms</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apartments.map((apartment) => (
                  <tr
                    key={apartment.id}
                    className="admin-table-row-clickable"
                    onClick={() => router.push(`/admin/apartments/${apartment.id}`)}
                  >
                    <td>#{apartment.id}</td>
                    <td style={{ fontWeight: 600 }}>{apartment.name}</td>
                    <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {apartment.address}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {apartment.owner.displayName || "Unnamed"}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--admin-text-secondary)",
                          }}
                        >
                          {apartment.owner.email}
                        </div>
                      </div>
                    </td>
                    <td>{getSubscriptionBadge(apartment.subscription)}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: getOccupancyColor(
                              apartment.occupiedRoomCount,
                              apartment.roomCount
                            ),
                          }}
                        >
                          {apartment.occupiedRoomCount} / {apartment.roomCount}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--admin-text-secondary)" }}>
                          occupied
                        </span>
                      </div>
                    </td>
                    <td>{formatDate(apartment.createdAt)}</td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/apartments/${apartment.id}`);
                        }}
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                      >
                        View
                      </button>
                    </td>
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
