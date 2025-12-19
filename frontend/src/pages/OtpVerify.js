import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "../api";

export default function OtpVerify() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      const res = await apiRequest("/auth/verify-otp", "POST", { email, otp });
      setMsg("OTP verified! You can now login.");
      console.log("[OTP] Verified", res);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message);
      console.error("[OTP] Error", err);
    }
  };

  return (
    <div className="form-container">
      <h2>Verify OTP</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} required />
        <button type="submit">Verify</button>
        {msg && <div className="success">{msg}</div>}
        {error && <div className="error">{error}</div>}
      </form>
      <div style={{marginTop:8, fontSize:14}}>OTP sent to: <b>{email}</b></div>
    </div>
  );
}
