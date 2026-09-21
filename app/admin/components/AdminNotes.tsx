"use client";

import { useEffect, useState } from "react";

type AdminNote = {
  id: number;
  note: string;
  createdAt: string;
  admin: {
    displayName: string | null;
    email: string | null;
  };
};

type AdminNotesProps = {
  userId: number;
};

export default function AdminNotes({ userId }: AdminNotesProps) {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = () => {
    setLoading(true);
    setError(null);

    fetch(`/api/admin/users/${userId}/notes`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch notes: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setNotes(data.notes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotes();
  }, [userId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add note");
      }

      setNewNote("");
      fetchNotes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="admin-loading" style={{ minHeight: "200px" }}>
        <div className="admin-spinner" style={{ width: "32px", height: "32px" }} />
      </div>
    );
  }

  return (
    <div className="admin-notes">
      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="admin-notes-form">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this user..."
          className="admin-textarea"
          rows={3}
          disabled={submitting}
        />
        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          disabled={submitting || !newNote.trim()}
        >
          {submitting ? "Adding..." : "Add Note"}
        </button>
      </form>

      {error && (
        <div className="admin-error" style={{ marginTop: "16px" }}>
          <div className="admin-error-message">{error}</div>
        </div>
      )}

      {/* Notes List */}
      <div className="admin-notes-list">
        {notes.length === 0 ? (
          <div className="admin-empty-message" style={{ textAlign: "center", padding: "24px" }}>
            No notes yet. Add a note to keep track of important information about this user.
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="admin-note-item">
              <div className="admin-note-header">
                <div className="admin-note-author">
                  <strong>{note.admin.displayName || note.admin.email || "Admin"}</strong>
                </div>
                <div className="admin-note-date">{formatDate(note.createdAt)}</div>
              </div>
              <div className="admin-note-content">{note.note}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
