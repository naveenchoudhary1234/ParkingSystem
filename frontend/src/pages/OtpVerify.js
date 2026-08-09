import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "../api";
import "../styles/auth.css";

export default function OtpVerify() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";
  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Format timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle OTP input change
  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newOtp.every((digit) => digit !== "") && index === 5) {
      handleSubmit(newOtp.join(""));
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split("").concat(Array(6).fill("")).slice(0, 6);
    setOtp(newOtp);

    // Focus last filled input
    const lastIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastIndex]?.focus();

    // Auto-submit if 6 digits pasted
    if (pastedData.length === 6) {
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (otpValue) => {
    const otpString = otpValue || otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await apiRequest("/auth/verify-otp", "POST", {
        email,
        otp: otpString
      });
      setSuccess("✅ OTP verified successfully!");
      console.log("[OTP] Verified", res);

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      console.error("[OTP] Error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      setError("");
      await apiRequest("/auth/resend-otp", "POST", { email });
      setSuccess("✅ New OTP sent to your email!");
      setTimer(300);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="error-state">
            <h3>⚠️ No Email Found</h3>
            <p>Please register first to receive an OTP.</p>
            <button onClick={() => navigate("/register")} className="auth-button">
              Go to Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container otp-container">
        <div className="auth-header">
          <div className="otp-icon">📧</div>
          <h2 className="auth-title">Verify Your Email</h2>
          <p className="auth-subtitle">
            We've sent a 6-digit code to<br />
            <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="auth-form">
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="otp-input"
                autoFocus={index === 0}
                disabled={loading}
              />
            ))}
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button
            type="submit"
            className="auth-button"
            disabled={loading || otp.some((d) => !d)}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <div className="otp-footer">
            <div className="timer">
              ⏱️ Time remaining: <strong>{formatTime(timer)}</strong>
            </div>

            {timer === 0 ? (
              <button
                type="button"
                onClick={handleResendOTP}
                className="resend-button"
                disabled={loading}
              >
                🔄 Resend OTP
              </button>
            ) : (
              <p className="resend-text">
                Didn't receive the code?
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="link-button"
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </p>
            )}
          </div>
        </form>

        <div className="auth-footer">
          <button
            onClick={() => navigate("/register")}
            className="link-button"
          >
            ← Back to Register
          </button>
        </div>
      </div>
    </div>
  );
}
