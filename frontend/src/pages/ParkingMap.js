
import React, { useEffect, useState } from "react";
import { apiRequest } from "../api";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
function NavigationMap({ from, to }) {
  const map = useMap();
  useEffect(() => {
    if (from && to) {
      map.flyTo(from, 14);
      // Draw a line (simple, not real routing)
      L.polyline([from, to], { color: "blue" }).addTo(map);
    }
  }, [from, to, map]);
  return null;
}

export default function ParkingMap() {
  const [lat, setLat] = useState(28.6139); // Default: New Delhi
  const [lng, setLng] = useState(77.2090);
  const [systems, setSystems] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");
  // const [selectedSlot, setSelectedSlot] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Geocode search (simple, using Nominatim)
  const geocode = async (query) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data[0]) {
      setLat(parseFloat(data[0].lat));
      setLng(parseFloat(data[0].lon));
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    throw new Error("Location not found");
  };

  useEffect(() => {
    apiRequest(`/parking-property/search?lat=${lat}&lng=${lng}`)
      .then(res => {
        setSystems(res);
        setError("");
        console.log("[Map] Parking properties loaded", res);
      })
      .catch(err => {
        setError(err.message);
        setSystems([]);
        console.error("[Map] Error", err);
      });
  }, [lat, lng]);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      await geocode(search);
    } catch (err) {
      setError("Location not found");
    }
  };

  const handleMarkerClick = (property) => {
    setSelected(property);
    setBookingMsg("");
    apiRequest(`/parking-property/${property._id}/slots`, "GET")
      .then(res => {
        setSlots(res);
        console.log("[Map] Property slots loaded", res);
      })
      .catch(err => {
        setSlots([]);
        console.error("[Map] Property slot error", err);
      });
  };

  const handleBookSlot = async (slot) => {
    setBookingMsg("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setBookingMsg("Please login to book a slot.");
        return;
      }
      // Book the slot via backend
      await apiRequest("/booking/create", "POST", { slotId: slot._id }, token);
      setBookingMsg("Booking successful! Proceed to payment.");
      // Refresh slots
      if (selected) handleMarkerClick(selected);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        });
      }
    } catch (err) {
      setBookingMsg("Booking failed: " + err.message);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="form-inline" style={{marginBottom:16}}>
        <input type="text" placeholder="Search location..." value={search} onChange={e => setSearch(e.target.value)} />
        <button type="submit">Search</button>
      </form>
      <MapContainer center={[lat, lng]} zoom={13} style={{ height: "400px", width: "100%", borderRadius:8 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {systems.map(property => (
          <Marker key={property._id} position={[property.location.coordinates[1], property.location.coordinates[0]]} eventHandlers={{ click: () => handleMarkerClick(property) }}>
            <Popup>
              <b>{property.name}</b><br/>{property.address}<br/>
              <span>Car Slots: {property.carSlots} | Bike Slots: {property.bikeSlots}</span><br/>
              <span>Price/hr: ₹{property.pricePerHour}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {selected && (
        <div className="form-container" style={{marginTop:24}}>
          <h3>{selected.name} - Slots</h3>
          <ul className="slot-list">
            {slots.map(slot => (
              <li key={slot._id} style={{background: slot.isBooked ? '#e57373' : '#81c784', color:'#222', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <span>Slot: {slot.slotNumber} - {slot.isBooked ? "Booked" : "Available"}</span>
                {!slot.isBooked && (
                  <button style={{marginLeft:8}} onClick={() => handleBookSlot(slot)}>Book</button>
                )}
              </li>
            ))}
          </ul>
          {bookingMsg && <div className={bookingMsg.startsWith("Booking successful") ? "success" : "error"}>{bookingMsg}</div>}
        </div>
      )}
      {/* Show navigation after booking */}
      {userLocation && selected && (
        <div className="form-container" style={{marginTop:24}}>
          <h3>Navigation</h3>
          <div>Distance: <b>{(Math.sqrt(
            Math.pow(userLocation[0] - selected.location.coordinates[1], 2) +
            Math.pow(userLocation[1] - selected.location.coordinates[0], 2)
          ) * 111).toFixed(2)} km</b> (approx)</div>
          <MapContainer center={userLocation} zoom={14} style={{ height: "300px", width: "100%", borderRadius:8, marginTop:8 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={userLocation}><Popup>Your Location</Popup></Marker>
            <Marker position={[selected.location.coordinates[1], selected.location.coordinates[0]]}><Popup>{selected.name}</Popup></Marker>
            <NavigationMap from={userLocation} to={[selected.location.coordinates[1], selected.location.coordinates[0]]} />
          </MapContainer>
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
