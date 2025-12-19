import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../api";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await apiRequest("/auth/login", "POST", { email, password });
      
      // Store both id and _id for compatibility
      const user = { 
        ...res.user, 
        _id: res.user._id || res.user.id, 
        id: res.user.id || res.user._id 
      };
      
      // Use AuthContext login method
      login(user, res.token);
      
      console.log("[Login] Success", res);
      console.log("[Login] User role:", user.role);
      
      // Navigate based on user role
      if (user.role === "rental") {
        navigate("/rental-dashboard");
      } else if (user.role === "owner") {
        navigate("/owner-dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
      console.error("[Login] Error", err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your ParkEasy account</p>
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
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="form-input"
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-large">
            Sign In
          </button>
          
          {error && <div className="error">{error}</div>}
        </form>
        
        <div className="auth-footer">
          <button 
            onClick={() => navigate("/forgot-password")} 
            className="btn btn-outline"
          >
            Forgot Password?
          </button>
          <p className="auth-link">
            Don't have an account? 
            <button 
              onClick={() => navigate("/register")} 
              className="link-button"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
