import React, { useState, useEffect } from 'react';
import { slotStatus, vehicleTypes } from '../data/parkingTemplates';
import '../styles/parking-slot-selector.css';

const ParkingSlotSelector = ({ 
  parkingProperty, 
  layoutData, 
  availableSlots = [], 
  bookedSlots = [], 
  onSlotSelect, 
  selectedSlot,
  vehicleType = 'car'
}) => {
  const [slotStates, setSlotStates] = useState({});
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Initialize slot states based on availability
  useEffect(() => {
    if (layoutData && layoutData.slots) {
      const states = {};

      // Iterate entries so we have the slotId (key) as authoritative id
      Object.entries(layoutData.slots).forEach(([slotId, slot]) => {
        // Check if slot is booked (bookedSlots come from server and may have _id)
        const isBooked = bookedSlots.some(bookedSlot => 
          bookedSlot.slotNumber === slot.slotNumber || bookedSlot._id === slotId || bookedSlot._id === slot.id
        );

        // Check if slot is available for the selected vehicle type
        const isAvailableForVehicleType = slot.vehicleType === vehicleType;

        if (isBooked) {
          states[slotId] = slotStatus.BOOKED;
        } else if (!isAvailableForVehicleType) {
          states[slotId] = slotStatus.UNAVAILABLE;
        } else if (slot.status === slotStatus.UNAVAILABLE) {
          states[slotId] = slotStatus.UNAVAILABLE;
        } else {
          states[slotId] = slotStatus.AVAILABLE;
        }
      });

      setSlotStates(states);
    }
  }, [layoutData, bookedSlots, vehicleType]);

  const handleSlotClick = (slot, slotId) => {
    if (slotStates[slotId] === slotStatus.AVAILABLE) {
      // Normalize slot object to match API/legacy shape expected by BookSlot
      const normalized = {
        _id: slotId,
        slotNumber: slot.slotNumber,
        vehicleType: slot.vehicleType,
        pricePerHour: slot.pricePerHour || parkingProperty.pricePerHour
      };
      onSlotSelect(normalized);
    }
  };

  const getSlotClass = (slot, slotId) => {
    let classes = ['parking-slot', 'customer-slot'];

    // Add status class
    const selectedSlotId = selectedSlot?._id || selectedSlot?.id || null;
    if (selectedSlotId === slotId) {
      classes.push('slot-selected');
    } else {
      classes.push(`slot-${slotStates[slotId] || slotStatus.AVAILABLE}`);
    }

    // Add vehicle type class
    classes.push(`vehicle-${slot.vehicleType}`);

    // Add hover class
    if (hoveredSlot === slotId && slotStates[slotId] === slotStatus.AVAILABLE) {
      classes.push('slot-hover');
    }

    return classes.join(' ');
  };

  const getSlotIcon = (slot, slotId) => {
    if (slotStates[slotId] === slotStatus.BOOKED) {
      return slot.vehicleType === vehicleTypes.CAR ? '🚗' : '🏍️';
    }

    if (slotStates[slotId] === slotStatus.UNAVAILABLE) {
      return '❌';
    }

    const selectedSlotId = selectedSlot?._id || selectedSlot?.id || null;
    if (selectedSlotId === slotId) {
      return slot.vehicleType === vehicleTypes.CAR ? '🚗' : '🏍️';
    }

    return slot.vehicleType === vehicleTypes.CAR ? '🅿️' : '🅿️';
  };

  const getSlotTooltip = (slot, slotId) => {
    const state = slotStates[slotId];
    let tooltip = `Slot ${slot.slotNumber}`;
    
    switch (state) {
      case slotStatus.AVAILABLE:
        tooltip += ` - Available for ${slot.vehicleType} - ₹${slot.pricePerHour}/hr`;
        break;
      case slotStatus.BOOKED:
        tooltip += ` - Currently Occupied`;
        break;
      case slotStatus.UNAVAILABLE:
        tooltip += ` - Not Available`;
        break;
      default:
        tooltip += ` - ${slot.vehicleType} slot`;
    }
    
    return tooltip;
  };

  if (!layoutData || !layoutData.layout) {
    return (
      <div className="slot-selector-placeholder">
        <p>No parking layout available</p>
      </div>
    );
  }

  const availableSlotsCount = Object.values(slotStates).filter(
    state => state === slotStatus.AVAILABLE
  ).length;

  const bookedSlotsCount = Object.values(slotStates).filter(
    state => state === slotStatus.BOOKED
  ).length;

  // Safe access for entry/exit indicators
  const entryPos = layoutData.entryExit?.entry;
  const exitPos = layoutData.entryExit?.exit;

  return (
    <div className="parking-slot-selector">
      <div className="selector-header">
        <h3>🎯 Select Your Parking Slot</h3>
        <div className="slot-stats">
          <span className="stat available">✅ {availableSlotsCount} Available</span>
          <span className="stat booked">🚗 {bookedSlotsCount} Occupied</span>
        </div>
      </div>

      <div className="legend-bar">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color selected"></div>
          <span>Selected</span>
        </div>
        <div className="legend-item">
          <div className="legend-color booked"></div>
          <span>Occupied</span>
        </div>
        <div className="legend-item">
          <div className="legend-color unavailable"></div>
          <span>Unavailable</span>
        </div>
      </div>

      <div className="layout-container">
        <div className="parking-grid customer-view" style={{
          gridTemplateRows: `repeat(${layoutData.layout.length}, 1fr)`,
          gridTemplateColumns: `repeat(${layoutData.layout[0]?.length || 1}, 1fr)`
        }}>
          {layoutData.layout.map((row, rowIndex) => 
            row.map((cell, colIndex) => {
              const slotId = `${rowIndex}-${colIndex}`;
              const slot = layoutData.slots[slotId];
              
              if (cell === 0) {
                // Road/driving space
                return (
                  <div key={slotId} className="road-space">
                    <div className="road-markers">
                      <span className="road-line">━</span>
                      <span className="road-line">━</span>
                    </div>
                  </div>
                );
              } else if (slot) {
                // Parking slot
                    return (
                  <div
                    key={slotId}
                    className={getSlotClass(slot, slotId)}
                    onClick={() => handleSlotClick(slot, slotId)}
                    onMouseEnter={() => setHoveredSlot(slotId)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    title={getSlotTooltip(slot, slotId)}
                  >
                    <div className="slot-number">{slot.slotNumber}</div>
                    <div className="slot-icon">
                      {getSlotIcon(slot, slotId)}
                    </div>
                    {slotStates[slotId] === slotStatus.AVAILABLE && (
                      <div className="slot-price">₹{parkingProperty.pricePerHour || slot.pricePerHour}</div>
                    )}
                    {slotStates[slotId] === slotStatus.BOOKED && (
                      <div className="slot-status">OCCUPIED</div>
                    )}
                  </div>
                );
              }
              
              return <div key={slotId} className="empty-space"></div>;
            })
          )}
        </div>

        {/* Entry/Exit indicators (render only when entry/exit info exists) */}
        {(entryPos || exitPos) && (
          <div className="direction-indicators">
            {entryPos && (
              <div className={`direction-marker entry-${entryPos}`}>
                <span className="direction-icon">🚪</span>
                <span className="direction-label">ENTRY</span>
              </div>
            )}

            {exitPos && (
              <div className={`direction-marker exit-${exitPos}`}>
                <span className="direction-icon">🚪</span>
                <span className="direction-label">EXIT</span>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedSlot && (
        <div className="selected-slot-info">
          <div className="selection-summary">
            <h4>🎯 Selected Slot</h4>
            <div className="selection-details">
              <span className="slot-detail">
                <strong>Slot:</strong> {selectedSlot.slotNumber}
              </span>
              <span className="slot-detail">
                <strong>Type:</strong> {selectedSlot.vehicleType === 'car' ? '🚗 Car' : '🏍️ Bike'}
              </span>
              <span className="slot-detail">
                <strong>Rate:</strong> ₹{selectedSlot.pricePerHour}/hour
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="helpful-tips">
        <h4>💡 Tips:</h4>
        <ul>
          <li>Green slots are available for booking</li>
          <li>Red slots are currently occupied</li>
          <li>Gray slots are not available</li>
          <li>Click on any green slot to select it</li>
        </ul>
      </div>
    </div>
  );
};

export default ParkingSlotSelector;