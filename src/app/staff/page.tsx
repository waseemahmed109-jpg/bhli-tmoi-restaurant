"use client";

import { useState, useEffect } from "react";
import { UserPlus, UserCircle, KeyRound, Trash2, ShieldAlert } from "lucide-react";
import "./staff.css";

type StaffMember = {
  id: string;
  username: string;
  role: string;
  createdAt: string;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Form states
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [resetPassword, setResetPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      setError("Could not load staff members");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add staff");
      }

      await fetchStaff();
      setIsAddModalOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewRole("staff");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete staff");
      }
      await fetchStaff();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setFormLoading(true);
    try {
      const res = await fetch(`/api/staff/${selectedUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });

      if (!res.ok) throw new Error("Failed to reset password");

      setIsResetModalOpen(false);
      setResetPassword("");
      setSelectedUserId(null);
      alert("Password reset successfully!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const openResetModal = (id: string) => {
    setSelectedUserId(id);
    setIsResetModalOpen(true);
  };

  if (loading) return <div className="staff-page-container">Loading staff...</div>;

  return (
    <div className="staff-page-container">
      <div className="staff-header">
        <div>
          <h1 className="staff-title">Staff Management</h1>
          <p className="staff-subtitle">Add or remove staff members and manage access</p>
        </div>
        <button className="add-staff-btn hover-lift" onClick={() => setIsAddModalOpen(true)}>
          <UserPlus size={20} />
          <span>Add Staff</span>
        </button>
      </div>

      <div className="staff-grid">
        {staff.map((user) => (
          <div key={user.id} className="staff-card hover-lift">
            <div className="staff-card-header">
              <div className="staff-info">
                <div className="staff-avatar">
                  <UserCircle size={32} />
                </div>
                <div className="staff-details">
                  <span className="staff-name">{user.username}</span>
                  <span className="staff-role">Role: {user.role}</span>
                </div>
              </div>
              {user.role === "admin" && <ShieldAlert size={20} color="var(--warning-color)" />}
            </div>
            
            <div className="staff-actions">
              <button className="action-btn" onClick={() => openResetModal(user.id)}>
                <KeyRound size={16} /> Reset Password
              </button>
              <button className="action-btn delete" onClick={() => handleDeleteStaff(user.id)}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Staff</h2>
            </div>
            <form onSubmit={handleAddStaff}>
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newUsername} 
                  onChange={(e) => setNewUsername(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Role</label>
                <select 
                  className="form-select" 
                  value={newRole} 
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="staff">Staff (Waiter)</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && <p className="error-text" style={{ marginTop: '1rem' }}>{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={formLoading}>
                  {formLoading ? "Adding..." : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Reset Password</h2>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={resetPassword} 
                  onChange={(e) => setResetPassword(e.target.value)} 
                  required 
                  minLength={4}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsResetModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={formLoading}>
                  {formLoading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
