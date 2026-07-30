import MyBookings from "./pages/MyBookings";
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import BookSlot from "./pages/BookSlot";
import Payment from "./pages/NewPayment";
import OtpVerify from "./pages/OtpVerify";
import OwnerDashboard from "./pages/NewOwnerDashboard";
import RentalDashboard from "./pages/RentalDashboard";
import ParkingCards from "./pages/ParkingCards";
import ParkingDetails from "./pages/ParkingDetails";
import Parking from "./pages/Parking";
import ParkingMap from "./pages/ParkingMap";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Favorites from "./pages/Favorites"; // ✅ Batch 1: Favorites page
import NotificationPreferences from "./pages/NotificationPreferences"; // ✅ Batch 2
import AIChatbot from "./components/AIChatbot";
import './index.css';
import './styles/responsive.css'; // ✅ Batch 1: Responsive design

function App() {

  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/parking" element={<Parking />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/book-slot" element={<ProtectedRoute><BookSlot /></ProtectedRoute>} />
            <Route path="/payment/:propertyId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
            <Route path="/otp-verify" element={<OtpVerify />} />
            <Route path="/rental-dashboard" element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRole="rental" component={RentalDashboard} />
              </ProtectedRoute>
            } />
            <Route path="/owner-dashboard" element={
              <ProtectedRoute>
                <RoleBasedRoute allowedRole="owner" component={OwnerDashboard} />
              </ProtectedRoute>
            } />
            <Route path="/parking-cards" element={<ParkingCards />} />
            <Route path="/parking-details/:id" element={<ProtectedRoute><ParkingDetails /></ProtectedRoute>} />
            <Route path="/map" element={<ParkingMap />} />
            <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} /> {/* ✅ Batch 1 */}
            <Route path="/notification-preferences" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} /> {/* ✅ Batch 2 */}
          </Routes>
          </div>
          <FooterConditional />

          {/* AI Chatbot - Available on all pages */}
          <AIChatbot />
        </div>
      </Router>
    </AuthProvider>
  );
}

// Component for role-based routing
const RoleBasedRoute = ({ allowedRole, component: Component }) => {
  const user = localStorage.getItem("user");
  const userRole = user ? JSON.parse(user).role : null;
  
  if (userRole === allowedRole) {
    return <Component />;
  }
  
  return <Navigate to="/" />;
};

// Footer wrapper to hide on specific routes
const FooterConditional = () => {
  const location = useLocation();
  // Hide footer only on rental dashboard
  if (location.pathname === "/rental-dashboard") return null;
  return <Footer />;
};

export default App;
