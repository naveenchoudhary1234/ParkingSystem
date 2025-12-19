import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import "../styles/auth.css";
import "../styles/auth.css";
import "../styles/auth.css";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await apiRequest("/auth/register", "POST", { name, email, phone, password, role });
      console.log("[Register] Success", res);
      navigate("/otp-verify", { state: { email } });
    } catch (err) {
      setError(err.message);
      console.error("[Register] Error", err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join ParkEasy and start your journey</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              placeholder="Enter your full name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              className="form-input"
            />
          </div>
          
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
            <label className="form-label">Phone Number</label>
            <input 
              type="text" 
              placeholder="Enter your phone number" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              required 
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              placeholder="Create a strong password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Register as</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value)} 
              required 
              className="form-select"
            >
              <option value="user">🚗 User (Find & book parking spots)</option>
              <option value="rental">🏢 Rental (Add parking properties)</option>
              <option value="owner">👑 Owner (Approve rental properties)</option>
            </select>
            <p className="role-description">
              {role === "user" && "Browse and book parking spots near your destination"}
              {role === "rental" && "Add your properties and start earning from parking spaces"}
              {role === "owner" && "Review and approve rental properties in your area"}
            </p>
          </div>
          
          <button type="submit" className="btn btn-primary btn-large">
            Create Account
          </button>
          
          {error && <div className="error">{error}</div>}
        </form>
        
        <div className="auth-footer">
          <p className="auth-link">
            Already have an account? 
            <button 
              onClick={() => navigate("/login")} 
              className="link-button"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
