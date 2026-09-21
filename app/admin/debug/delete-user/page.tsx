"use client";

import { useState } from "react";

export default function DebugDeleteUserPage() {
  const [email, setEmail] = useState("wanwit.phbn@gmail.com");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete user: ${email}?`)) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/debug/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setResult({ status: res.status, data });
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>🚨 Debug: Delete User</h1>
      
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Email:
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            fontSize: "1rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      <button
        onClick={handleDelete}
        disabled={loading}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Deleting..." : "Delete User"}
      </button>

      {result && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            backgroundColor: result.error ? "#f8d7da" : "#d4edda",
            border: `1px solid ${result.error ? "#f5c6cb" : "#c3e6cb"}`,
            borderRadius: "4px",
          }}
        >
          <h3>Result:</h3>
          <pre style={{ overflow: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#fff3cd", border: "1px solid #ffc107", borderRadius: "4px" }}>
        <h3>⚠️ Warning</h3>
        <p>This will permanently delete the user and all related data (subscriptions, apartments, memberships).</p>
        <p><strong>After deletion:</strong></p>
        <ol>
          <li>Logout from the system</li>
          <li>Login again with the same email</li>
          <li>User will be created fresh with PLATFORM_ADMIN role only</li>
        </ol>
      </div>
    </div>
  );
}
