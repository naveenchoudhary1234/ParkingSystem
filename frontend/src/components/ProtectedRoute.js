import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("[Auth] No token, redirecting to login");
    return <Navigate to="/login" />;
  }
  return children;
}
