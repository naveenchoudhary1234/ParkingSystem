import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api";
import "../styles/auth.css";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setMsg("");

    if (!token) {
      setError("Reset link is invalid or missing. Please request a new one.");
      return;
    }

    try {
      const res = await apiRequest("/auth/reset-password", "POST", { token, newPassword });
      const message = res.message || res.msg || "Password reset successful";
      setMsg(message);
      console.log("[ResetPassword] Success", res);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message);
      console.error("[ResetPassword] Error", err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">Choose a new password to secure your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-large">
            Reset Password
          </button>

          {msg && <div className="success">{msg}</div>}
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
}
