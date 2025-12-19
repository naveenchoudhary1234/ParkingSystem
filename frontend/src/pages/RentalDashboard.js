import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ParkingLayoutDesigner from "../components/ParkingLayoutDesigner";
import LocationSearchComponent from "../components/LocationSearchComponent";
import GoogleMapPicker from "../components/GoogleMapPicker";
import LayoutConsistencyChecker from "../components/LayoutConsistencyChecker";
import "../styles/dashboard.css";
import "../styles/layout-management.css";
import "../styles/layout-management.css";
import "../styles/LocationSearchComponent.css";

const RentalDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // UI state
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLayoutDesigner, setShowLayoutDesigner] = useState(false);
  const [selectedPropertyForLayout, setSelectedPropertyForLayout] = useState(null);

  // Properties & stats (mocked here — replace with real API)
  const [properties, setProperties] = useState([]);
  const [rentalStats, setRentalStats] = useState({
    totalProperties: 0,
    totalSlots: 0,
    occupancyRate: 0,
    monthlyRevenue: 0,
    carsBooked: 0,
    bikesBooked: 0,
  });

  // New property form state
  const [newProperty, setNewProperty] = useState({
    name: "",
    fullAddress: "",
    address: "",
    coordinates: null, // [lng, lat]
    latitude: "",
    longitude: "",
    contactNumber: "",
    carSlots: 0,
    bikeSlots: 0,
    pricePerHour: 0,
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Multi-step form state
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formStep, setFormStep] = useState(1); // 1: Property Details, 2: Layout Design
  const [selectedLayout, setSelectedLayout] = useState(null);

  // Address search state (debounced)
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Load rental properties on mount
  useEffect(() => {
    loadRentalProperties();
  }, []);

  const loadRentalProperties = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, user not logged in");
        return;
      }

      console.log("🔄 Loading rental properties...");
      const response = await fetch("http://localhost:5000/api/parking-property/my-properties", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to load properties");
      }

      const myProperties = await response.json();
      console.log("✅ Loaded rental properties:", myProperties);

      setProperties(myProperties);
      
      // Load real-time rental statistics from the new API
      console.log("🔄 Loading rental statistics...");
      const statsResponse = await fetch("http://localhost:5000/api/parking-property/rental-stats", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        console.log("✅ Loaded rental stats:", stats);
        
        setRentalStats({
          totalProperties: stats.totalProperties,
          totalSlots: stats.totalSlots,
          occupancyRate: Math.round(stats.occupancyRate),
          totalRevenue: Math.round(stats.totalRevenue || 0), // Use totalRevenue from backend
          monthlyRevenue: Math.round(stats.revenue || 0),
          carsBooked: stats.carsBooked,
          bikesBooked: stats.bikesBooked
        });
      } else {
        console.warn("Failed to load rental stats, using fallback calculation");
        // Fallback to old calculation if API fails
        const totalSlots = myProperties.reduce((sum, prop) => {
          return sum + (prop.carSlots || 0) + (prop.bikeSlots || 0);
        }, 0);

        const approvedProperties = myProperties.filter(prop => prop.approved);
        const occupancyRate = myProperties.length > 0 ? 
          Math.round((approvedProperties.length / myProperties.length) * 100) : 0;

        // Mock revenue calculation
        const monthlyRevenue = approvedProperties.reduce((sum, prop) => {
          return sum + (prop.pricePerHour * ((prop.carSlots || 0) + (prop.bikeSlots || 0)) * 24 * 30 * 0.6);
        }, 0);

        setRentalStats({
          totalProperties: myProperties.length,
          totalSlots: totalSlots,
          occupancyRate: occupancyRate,
          monthlyRevenue: Math.round(monthlyRevenue),
          carsBooked: 0,
          bikesBooked: 0
        });
      }

    } catch (err) {
      console.error("❌ Failed to load rental properties:", err);
      // Fallback to empty state
      setProperties([]);
      setRentalStats({
        totalProperties: 0,
        totalSlots: 0,
        occupancyRate: 0,
        monthlyRevenue: 0,
        carsBooked: 0,
        bikesBooked: 0
      });
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout(); // depends on your AuthContext implementation
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Debounced address search using real geocoding API
  const searchAddress = (query) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query || query.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Use Nominatim (OpenStreetMap) geocoding API - it's free and doesn't require API key
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`);
        const data = await response.json();
        
        const results = data.map(item => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));
        
        console.log('🔍 Geocoding results for:', query, results);
        setSearchResults(results);
      } catch (error) {
        console.error('Geocoding error:', error);
        // Fallback to empty results instead of mock Delhi coordinates
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 450);
  };

  const handleAddressChange = (value) => {
    setNewProperty({ ...newProperty, fullAddress: value, coordinates: null });
    searchAddress(value);
  };

  const selectAddress = (result) => {
    setNewProperty({
      ...newProperty,
      fullAddress: result.display_name,
      address: result.display_name.split(",")[0],
      coordinates: [result.lng, result.lat],
    });
    setSearchResults([]);
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    // TODO: upload files to storage and store URLs. For now, store file names.
    setPhotos(files.map((f) => f.name));
  };

  const handleLocationSelect = (location) => {
    console.log("📍 Location selected:", location);
    
    // Validate address - don't allow coordinate-like addresses or "Selected location" to overwrite real addresses
    const isCoordinateAddress = location.address && 
      /^[-+]?\d+\.?\d*,\s*[-+]?\d+\.?\d*$/.test(location.address.trim());
    
    const isGenericLocation = location.address && 
      (location.address.trim() === "Selected location" || 
       location.address.trim() === "Property location");
    
    if (isCoordinateAddress) {
      console.log("⚠️ Detected coordinate-like address, preserving original address");
    }
    
    if (isGenericLocation) {
      console.log("⚠️ Detected generic location name, preserving original address");
    }
    
    setSelectedLocation(location);
    setNewProperty(prev => ({
      ...prev,
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
      // Only update address if it's a real address, not coordinates or generic location names
      fullAddress: (!location.address || isCoordinateAddress || isGenericLocation) ? 
        prev.fullAddress : location.address
    }));
    setError("");
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    setError("");
    
    console.log("🚀 PROPERTY CREATION DEBUG START");
    console.log("1️⃣ Form data before processing:", {
      name: newProperty.name,
      address: newProperty.address,
      fullAddress: newProperty.fullAddress,
      latitude: newProperty.latitude,
      longitude: newProperty.longitude,
      selectedLocation: selectedLocation
    });
    
    if (formStep === 1) {
      // Step 1: Validate property details, then move to layout step
      // Check if coordinates are provided (either from search or manually entered)
      let coordinates = null;
      
      if (selectedLocation) {
        // Use selected location from search
        coordinates = [selectedLocation.lng, selectedLocation.lat]; // [lng, lat] format for GeoJSON
      } else if (newProperty.latitude && newProperty.longitude) {
        // Use manually entered coordinates
        const lat = parseFloat(newProperty.latitude);
        const lng = parseFloat(newProperty.longitude);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          setError("Please enter valid latitude and longitude values.");
          return;
        }
        
        coordinates = [lng, lat]; // [lng, lat] format for GeoJSON
      }
      
      console.log("2️⃣ Coordinates determined:", coordinates);
      
      if (!coordinates) {
        setError("Please search for a location or enter coordinates manually.");
        return;
      }

      if (!newProperty.contactNumber) {
        setError("Please enter your contact number for users to reach you.");
        return;
      }

      if (!newProperty.fullAddress || newProperty.fullAddress.trim().length < 10) {
        setError("Please enter a complete address (at least 10 characters) for easy navigation by users.");
        return;
      }
      
      console.log("3️⃣ Validation passed, moving to layout step");
      console.log("4️⃣ Address state before layout step:", {
        address: newProperty.address,
        fullAddress: newProperty.fullAddress
      });      // Validate slot numbers
      if (!newProperty.carSlots && !newProperty.bikeSlots) {
        setError("Please specify the number of car and/or bike slots for your parking space.");
        return;
      }
      
      if (newProperty.carSlots < 0 || newProperty.bikeSlots < 0) {
        setError("Slot numbers cannot be negative.");
        return;
      }
      
      // Store coordinates and move to step 2
      setNewProperty(prev => ({ ...prev, coordinates }));
      setFormStep(2);
      return;
    }
    
    // Step 2: Create property with layout
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to add properties");
        return;
      }

      // Validate that layout has been created
      if (!selectedLayout) {
        setError("Please design a parking layout before submitting your property. This ensures users can easily find parking spots and navigation points.");
        setLoading(false);
        return;
      }

      // Prepare the data for API call
      // Ensure we have proper address data - ALWAYS prioritize user's manually entered address
      let finalAddress = newProperty.address;
      let finalFullAddress = newProperty.fullAddress;
      
      console.log("🏗️ Property creation - Address debug:", {
        userEnteredAddress: newProperty.address,
        userEnteredFullAddress: newProperty.fullAddress,
        selectedLocation: selectedLocation,
        coordinatesFromProperty: newProperty.coordinates
      });
      
      // If using location search, extract address info ONLY if user hasn't manually entered address
      if (selectedLocation && !finalFullAddress) {
        finalAddress = selectedLocation.display_name ? 
          selectedLocation.display_name.split(',')[0] + ", " + selectedLocation.display_name.split(',')[1] : 
          selectedLocation.name || newProperty.fullAddress || "Property location";
        finalFullAddress = selectedLocation.display_name || selectedLocation.name || newProperty.fullAddress || finalAddress;
      }
      
      // NEVER use "Selected location" - always preserve user's address
      if (finalFullAddress === "Selected location" || !finalFullAddress) {
        finalFullAddress = newProperty.fullAddress || newProperty.address || newProperty.name + " Location";
      }
      if (finalAddress === "Selected location" || !finalAddress) {
        finalAddress = newProperty.address || newProperty.fullAddress || newProperty.name;
      }
      
      console.log("✅ Final addresses for property creation:", {
        finalAddress: finalAddress,
        finalFullAddress: finalFullAddress
      });
      
      console.log("5️⃣ Property data being sent to backend:", {
        name: newProperty.name,
        address: finalAddress,
        fullAddress: finalFullAddress,
        coordinatesFromProperty: newProperty.coordinates
      });

      const propertyData = {
        name: newProperty.name,
        address: finalAddress,
        fullAddress: finalFullAddress,
        contactNumber: newProperty.contactNumber,
        location: {
          type: "Point",
          coordinates: newProperty.coordinates // [lng, lat]
        },
        carSlots: parseInt(newProperty.carSlots) || 0,
        bikeSlots: parseInt(newProperty.bikeSlots) || 0,
        pricePerHour: parseFloat(newProperty.pricePerHour) || 0,
        photos: photos, // Will be handled by backend for file upload
        layoutData: selectedLayout // Include layout data
      };

      console.log("🚀 Submitting property with layout for approval:", propertyData);

      const response = await fetch("http://localhost:5000/api/parking-property/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(propertyData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add property");
      }

      const added = await response.json();
      console.log("✅ Property with layout added successfully:", added);
      console.log("6️⃣ VERIFICATION - Property address in database:", {
        id: added._id,
        name: added.name,
        address: added.address,
        fullAddress: added.fullAddress
      });

      // Update local state
      setProperties((prev) => [added, ...prev]);
      setRentalStats((prev) => ({
        ...prev,
        totalProperties: prev.totalProperties + 1,
        totalSlots:
          prev.totalSlots + (newProperty.carSlots || 0) + (newProperty.bikeSlots || 0),
      }));

      // Reset form
      setNewProperty({
        name: "",
        fullAddress: "",
        address: "",
        coordinates: null,
        latitude: "",
        longitude: "",
        contactNumber: "",
        carSlots: 0,
        bikeSlots: 0,
        pricePerHour: 0,
      });
      setPhotos([]);
      setSelectedLocation(null);
      setSelectedLayout(null);
      setFormStep(1);
      setShowAddForm(false);
      alert("Property with layout submitted successfully! It will be reviewed by the owner for approval.");
    } catch (err) {
      console.error("❌ Add property error:", err);
      setError(err.message || "Failed to add property. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Layout management functions
  const handleCreateLayout = (property) => {
    setSelectedPropertyForLayout(property);
    setShowLayoutDesigner(true);
    setActiveTab("layout-designer");
  };

  // Handle layout selection in new property form
  const handleLayoutSelect = (layoutConfig) => {
    console.log("🎯 Layout selected for new property:", layoutConfig);
    setSelectedLayout(layoutConfig);
  };

  // Go back to step 1
  const handleBackToStep1 = () => {
    setFormStep(1);
    setSelectedLayout(null);
    setError("");
  };

  const handleSaveLayout = async (layoutConfig) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to save layout");
        return;
      }

      console.log("🎯 Saving layout for property:", selectedPropertyForLayout._id, layoutConfig);

      const response = await fetch(`http://localhost:5000/api/parking-property/${selectedPropertyForLayout._id}/layout`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ layoutData: layoutConfig })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save layout");
      }

      const updatedProperty = await response.json();
      console.log("✅ Layout saved successfully:", updatedProperty);

      // Update local state
      setProperties(prev => prev.map(p => 
        p._id === selectedPropertyForLayout._id 
          ? { ...p, layoutData: layoutConfig }
          : p
      ));

      // Close designer
      setShowLayoutDesigner(false);
      setSelectedPropertyForLayout(null);
      setActiveTab("properties");
      alert("Layout saved successfully! Your parking space is now ready for bookings.");

    } catch (err) {
      console.error("❌ Save layout error:", err);
      setError(err.message || "Failed to save layout. Please try again.");
    }
  };

  const handleCancelLayout = () => {
    setShowLayoutDesigner(false);
    setSelectedPropertyForLayout(null);
    setActiveTab("properties");
  };

  // Toggle property active/inactive status
  const handleTogglePropertyStatus = async (propertyId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/parking-property/toggle-status/${propertyId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ active: !currentStatus })
      });

      if (!response.ok) {
        throw new Error("Failed to toggle property status");
      }

      // Reload properties to get updated status
      loadRentalProperties();
    } catch (err) {
      console.error("Error toggling property status:", err);
      setError("Failed to update property status");
    }
  };

  // Delete property permanently
  const handleDeleteProperty = async (propertyId, propertyName) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${propertyName}"?\n\nThis action cannot be undone and will remove all associated bookings and layout data.`
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/parking-property/${propertyId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete property");
      }

      // Reload properties after deletion
      loadRentalProperties();
    } catch (err) {
      console.error("Error deleting property:", err);
      setError("Failed to delete property");
    }
  };

  const getStatusBadge = (approved) =>
    approved ? (
      <span className="status-badge status-approved">✅ Approved</span>
    ) : (
      <span className="status-badge status-pending">⏳ Pending</span>
    );

  // JSX
  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">🏢 Rental Portal</h2>
          <p className="sidebar-subtitle">Welcome back, {user?.firstName || "Owner"}</p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("overview");
            }}
          >
            <span className="nav-icon">📊</span> Overview
          </button>
          <button
            className={`nav-item ${activeTab === "properties" ? "active" : ""}`}
            onClick={() => setActiveTab("properties")}
          >
            <span className="nav-icon">🏢</span> My Properties
          </button>
          <button
            className={`nav-item ${activeTab === "add-property" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("add-property");
              setShowAddForm(true);
            }}
          >
            <span className="nav-icon">➕</span> Add Property
          </button>
          
          {showLayoutDesigner && (
            <button
              className={`nav-item ${activeTab === "layout-designer" ? "active" : ""}`}
              onClick={() => setActiveTab("layout-designer")}
            >
              <span className="nav-icon">🎯</span> Layout Designer
            </button>
          )}

          <div className="sidebar-footer">
            <button className="btn btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        {/* Header area */}
        <header className="content-header">
          <h1 className="page-title">
            {activeTab === "overview"
              ? "Dashboard Overview"
              : activeTab === "properties"
              ? "My Properties"
              : activeTab === "layout-designer"
              ? "Parking Layout Designer"
              : "Add New Property"}
          </h1>
          <p className="page-subtitle">
            {activeTab === "overview"
              ? "Monitor your parking properties and earnings"
              : activeTab === "properties"
              ? "Manage your existing parking properties"
              : activeTab === "layout-designer"
              ? "Design your visual parking layout"
              : "Add a new property to start earning"}
          </p>
        </header>

        {/* Content */}
        <section className="dashboard-content">
          {activeTab === "overview" && (
            <div className="section-card">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🏢</div>
                  <div className="stat-content">
                    <div className="stat-number">{rentalStats.totalProperties}</div>
                    <p className="stat-label">Total Properties</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🅿️</div>
                  <div className="stat-content">
                    <div className="stat-number">{rentalStats.totalSlots}</div>
                    <p className="stat-label">Total Slots</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🚗</div>
                  <div className="stat-content">
                    <div className="stat-number">{rentalStats.carsBooked || 0}</div>
                    <p className="stat-label">Cars Booked</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🏍️</div>
                  <div className="stat-content">
                    <div className="stat-number">{rentalStats.bikesBooked || 0}</div>
                    <p className="stat-label">Bikes Booked</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-number">{rentalStats.occupancyRate}%</div>
                    <p className="stat-label">Occupancy Rate</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <div className="stat-number">₹{rentalStats.totalRevenue || rentalStats.monthlyRevenue}</div>
                    <p className="stat-label">Total Revenue</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "properties" && (
            <div className="section-card">
              <h2 className="section-title">My Properties</h2>
              {properties.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏢</div>
                  <h3 className="empty-title">No properties yet</h3>
                  <p className="empty-description">
                    Start by adding your first parking property to begin earning.
                  </p>
                </div>
              ) : (
                <div className="properties-grid-enhanced">
                  {properties.map((property) => (
                    <div key={property._id} className="property-card-enhanced">
                      <div className="property-card-header">
                        <h3 className="property-name">{property.name}</h3>
                        <div className="property-status">
                          {getStatusBadge(property.approved)}
                          {property.approved && (
                            <span className={`activity-badge ${property.active !== false ? 'active' : 'inactive'}`}>
                              {property.active !== false ? '🟢 LIVE' : '🔴 STOPPED'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="property-address">📍 {property.fullAddress || property.address}</p>
                      
                      <div className="property-stats">
                        <div className="stat-item">
                          <span className="stat-icon">🚗</span>
                          <span className="stat-text">{property.carSlots} Cars</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-icon">🏍️</span>
                          <span className="stat-text">{property.bikeSlots} Bikes</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-icon">💰</span>
                          <span className="stat-text">₹{property.pricePerHour}/hr</span>
                        </div>
                      </div>
                      
                      {property.layoutData && (
                        <div className="layout-info">
                          <span className="layout-badge">
                            ✅ Layout: {property.layoutData.templateName}
                          </span>
                        </div>
                      )}
                      
                      <div className="property-actions-enhanced">
                        {property.approved ? (
                          <div className="actions-row">
                            {/* Layout Button */}
                            <button 
                              className="btn-action btn-layout"
                              onClick={() => handleCreateLayout(property)}
                              title={property.layoutData ? "Edit Layout" : "Create Layout"}
                            >
                              {property.layoutData ? '🎯 Edit Layout' : '🎨 Create Layout'}
                            </button>
                            
                            {/* Stop/Start Button */}
                            <button 
                              className={`btn-action btn-toggle ${property.active !== false ? 'btn-stop' : 'btn-start'}`}
                              onClick={() => handleTogglePropertyStatus(property._id, property.active !== false)}
                              title={property.active !== false ? "Stop property (hide from users)" : "Start property (show to users)"}
                            >
                              {property.active !== false ? '⏸️ Stop' : '▶️ Start'}
                            </button>
                            
                            {/* Delete Button */}
                            <button 
                              className="btn-action btn-delete"
                              onClick={() => handleDeleteProperty(property._id, property.name)}
                              title="Delete property permanently"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        ) : (
                          <div className="waiting-approval">
                            <p className="approval-text">⏳ Waiting for owner approval...</p>
                            <button 
                              className="btn-action btn-delete-pending"
                              onClick={() => handleDeleteProperty(property._id, property.name)}
                              title="Cancel and delete this property"
                            >
                              🗑️ Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "layout-designer" && showLayoutDesigner && selectedPropertyForLayout && (
            <ParkingLayoutDesigner
              property={selectedPropertyForLayout}
              onSave={handleSaveLayout}
              onCancel={handleCancelLayout}
            />
          )}

          {activeTab === "add-property" && (
            <div className="section-card">
              <h2 className="section-title">
                Add New Parking Property
                <span style={{ 
                  fontSize: '0.8rem', 
                  marginLeft: '10px', 
                  color: 'var(--text-light)' 
                }}>
                  Step {formStep} of 2
                </span>
              </h2>
              
              {/* Step Progress Indicator */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '8px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: formStep >= 1 ? 'var(--success-color)' : 'var(--text-light)'
                }}>
                  <span style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%',
                    backgroundColor: formStep >= 1 ? 'var(--success-color)' : 'rgba(255,255,255,0.2)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {formStep > 1 ? '✓' : '1'}
                  </span>
                  <span style={{ marginLeft: '8px', fontSize: '0.9rem' }}>Property Details</span>
                </div>
                
                <div style={{ 
                  flex: 1, 
                  height: '2px', 
                  backgroundColor: formStep >= 2 ? 'var(--success-color)' : 'rgba(255,255,255,0.2)',
                  margin: '0 15px' 
                }} />
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: formStep >= 2 ? 'var(--success-color)' : 'var(--text-light)'
                }}>
                  <span style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%',
                    backgroundColor: formStep >= 2 ? 'var(--success-color)' : 'rgba(255,255,255,0.2)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {formStep > 2 ? '✓' : '2'}
                  </span>
                  <span style={{ marginLeft: '8px', fontSize: '0.9rem' }}>Layout Design</span>
                </div>
              </div>

              {error && (
                <div className="error-banner">
                  <strong>Error:</strong> {error}
                </div>
              )}
              
              {formStep === 1 ? (
                // Step 1: Property Details Form
                <form onSubmit={handleAddProperty} className="property-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Property Name</label>
                    <input
                      type="text"
                      value={newProperty.name}
                      onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Full Address (start typing to search)</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={newProperty.fullAddress}
                        onChange={(e) => handleAddressChange(e.target.value)}
                        className="form-input"
                        placeholder="e.g., Sector 27, Near Metro Station"
                        required
                      />
                      {isSearching && <div className="search-indicator">Searching...</div>}

                      {searchResults.length > 0 && (
                        <div className="search-results">
                          {searchResults.map((r, idx) => (
                            <div
                              key={idx}
                              className="search-result-item"
                              onClick={() => selectAddress(r)}
                            >
                              <div className="result-name">{r.display_name}</div>
                              <div className="result-coords">
                                📍 {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Contact Number *</label>
                    <input
                      type="tel"
                      value={newProperty.contactNumber}
                      onChange={(e) => setNewProperty({ ...newProperty, contactNumber: e.target.value })}
                      className="form-input"
                      placeholder="e.g., +91 9876543210"
                      required
                    />
                    <small className="form-help">Users will see this number to contact you directly</small>
                  </div>

                  <div className="form-group">
                    <label>📍 Complete Address *</label>
                    <textarea
                      value={newProperty.fullAddress}
                      onChange={(e) => setNewProperty({ ...newProperty, fullAddress: e.target.value })}
                      className="form-input"
                      placeholder="Example: HansiGate, Near City Hospital, Main Road, Bhiwani, Haryana 127021"
                      rows="3"
                      required
                    />
                    <small className="form-help">
                      � <strong>Critical for Navigation:</strong> Enter complete address with landmarks, city, state so users can easily navigate using Google Maps.
                      <br />
                      📍 <strong>Good Example:</strong> "Sector 17 Plaza, Near HDFC Bank, Chandigarh 160017"
                      <br />
                      ❌ <strong>Bad Example:</strong> Just "HansiGate" - Users won't find this on GPS!
                    </small>
                  </div>

                  <div className="form-group">
                    <label>📌 Property Location (Coordinates)</label>
                    
                    {/* Enhanced Google Maps Location Picker */}
                    <GoogleMapPicker 
                      onLocationSelect={handleLocationSelect}
                      currentLocation={selectedLocation}
                      currentAddress={newProperty.fullAddress}
                    />
                    
                    <div className="location-help-note">
                      ℹ️ <strong>Why coordinates?</strong> Exact coordinates ensure users can navigate directly to your parking entrance using any GPS app.
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Property Photos (optional)</label>
                    <input type="file" multiple accept="image/*" onChange={handlePhotoChange} />
                    {photos.length > 0 && (
                      <div className="note">✅ {photos.length} photo(s) selected</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Car Slots</label>
                    <input
                      type="number"
                      min="0"
                      value={newProperty.carSlots}
                      onChange={(e) =>
                        setNewProperty({ ...newProperty, carSlots: parseInt(e.target.value) || 0 })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Bike Slots</label>
                    <input
                      type="number"
                      min="0"
                      value={newProperty.bikeSlots}
                      onChange={(e) =>
                        setNewProperty({ ...newProperty, bikeSlots: parseInt(e.target.value) || 0 })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Price per Hour (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={newProperty.pricePerHour}
                      onChange={(e) =>
                        setNewProperty({
                          ...newProperty,
                          pricePerHour: parseInt(e.target.value) || 0,
                        })
                      }
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setNewProperty({
                        name: "",
                        fullAddress: "",
                        address: "",
                        coordinates: null,
                        latitude: "",
                        longitude: "",
                        contactNumber: "",
                        carSlots: 0,
                        bikeSlots: 0,
                        pricePerHour: 0,
                      });
                      setPhotos([]);
                      setSearchResults([]);
                      setFormStep(1);
                      setSelectedLayout(null);
                    }}
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    Next: Design Layout →
                  </button>
                </div>
              </form>
              ) : (
                // Step 2: Layout Design
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: 'var(--text-dark)', marginBottom: '10px' }}>
                      🎨 Design Your Parking Layout
                    </h3>
                    <p style={{ color: 'var(--text-light)', marginBottom: '0' }}>
                      Choose a layout template that matches your parking space. You can customize it further after creation.
                    </p>
                  </div>
                  
                  <ParkingLayoutDesigner
                    property={newProperty}
                    onSave={handleLayoutSelect}
                    onCancel={handleBackToStep1}
                    isNewProperty={true}
                  />
                  
                  <div className="form-actions" style={{ marginTop: '20px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleBackToStep1}
                    >
                      ← Back to Details
                    </button>
                    
                    {selectedLayout ? (
                      <div>
                        {/* Layout Consistency Check */}
                        <LayoutConsistencyChecker 
                          property={{
                            ...newProperty,
                            layoutData: selectedLayout,
                            name: newProperty.name || "New Property",
                            _id: "pending-creation"
                          }} 
                          step="rental-property-creation" 
                        />
                        
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleAddProperty}
                          disabled={loading}
                        >
                          {loading ? "Creating Property..." : "✅ Create Property with Layout"}
                        </button>
                      </div>
                    ) : (
                      <div className="layout-required-notice">
                        <p>🎯 <strong>Layout Required:</strong> Please design your parking layout above to enable property creation.</p>
                        <p><small>This ensures users can easily navigate and find their parking spots.</small></p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default RentalDashboard;
