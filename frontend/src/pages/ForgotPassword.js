import React, { useState } from "react";
import { apiRequest } from "../api";

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
    <div className="form-container">
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <button type="submit">Send Reset Link</button>
        {msg && <div className="success">{msg}</div>}
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
