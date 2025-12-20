import React, { useState } from "react";
import { apiRequest } from "../api";
import "../styles/auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      const res = await apiRequest("/auth/forgot-password", "POST", { email });
      setMsg(res.msg);
      console.log("[ForgotPassword] Success", res);
    } catch (err) {
      setError(err.message);
      console.error("[ForgotPassword] Error", err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h2 className="auth-title">Forgot Password</h2>
          <p className="auth-subtitle">Send a reset link to your email</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-large">
            Send Reset Link
          </button>

          {msg && <div className="success">{msg}</div>}
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
}
