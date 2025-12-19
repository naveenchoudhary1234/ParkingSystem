import React, { useEffect, useState } from 'react';

const LayoutConsistencyChecker = ({ property, step = "unknown" }) => {
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    if (property) {
      const validation = validateLayoutConsistency(property, step);
      setValidationResult(validation);
      
      // Log detailed validation results
      console.log(`🔍 Layout Consistency Check at ${step}:`, validation);
      
      if (!validation.isValid) {
        console.warn(`⚠️ Layout inconsistency detected at ${step}:`, validation.issues);
      }
    }
  }, [property, step]);

  const validateLayoutConsistency = (property, currentStep) => {
    const issues = [];
    let isValid = true;

    console.log("🔍 Validating layout for property:", property.name);
    console.log("📊 Layout data:", property.layoutData);

    // Check if layout data exists
    if (!property.layoutData) {
      issues.push("No layout data found");
      isValid = false;
    } else {
      // Check if layout has required structure
      if (!property.layoutData.slots) {
        issues.push("Layout data missing slots information");
        isValid = false;
      } else {
        console.log("🎯 Analyzing slots:", property.layoutData.slots);
        
        // Handle both object and array slot formats
        let slotsArray = [];
        let slotsCount = 0;
        
        if (Array.isArray(property.layoutData.slots)) {
          slotsArray = property.layoutData.slots;
          slotsCount = slotsArray.length;
        } else if (typeof property.layoutData.slots === 'object') {
          slotsArray = Object.values(property.layoutData.slots);
          slotsCount = Object.keys(property.layoutData.slots).length;
        }
        
        console.log("📋 Processed slots array:", slotsArray);
        console.log("🔢 Slots count:", slotsCount);

        // Check if layout data structure is complete
        if (slotsArray.length > 0) {
          const incompleteSlots = slotsArray.filter(slot => {
            // More flexible validation - check what fields actually exist
            const hasId = slot.id !== undefined || slot.slotId !== undefined || slot._id !== undefined;
            
            // Check for type field variants
            const hasType = slot.type !== undefined || slot.vehicleType !== undefined;
            
            // Check for position - can be explicit coordinates or encoded in ID
            const hasExplicitPosition = (slot.x !== undefined && slot.y !== undefined) || 
                                      (slot.position !== undefined) ||
                                      (slot.coordinates !== undefined);
            
            // Check if position is encoded in ID (e.g., "2-4" format)
            const hasEncodedPosition = slot.id && typeof slot.id === 'string' && slot.id.includes('-');
            
            const hasPosition = hasExplicitPosition || hasEncodedPosition;
            
            console.log("🔍 Slot validation:", {
              slotId: slot.id || slot.slotId || slot._id,
              slot: slot,
              hasId: hasId,
              hasType: hasType,
              hasExplicitPosition: hasExplicitPosition,
              hasEncodedPosition: hasEncodedPosition,
              hasPosition: hasPosition,
              isComplete: hasId && hasType && hasPosition
            });
            
            return !(hasId && hasType && hasPosition);
          });
          
          if (incompleteSlots.length > 0) {
            console.log("❌ Incomplete slots details:", incompleteSlots.map(slot => ({
              id: slot.id || slot.slotId,
              hasId: !!(slot.id || slot.slotId || slot._id),
              hasType: !!(slot.type || slot.vehicleType),
              hasPosition: !!(slot.x !== undefined && slot.y !== undefined) || 
                          !!(slot.id && typeof slot.id === 'string' && slot.id.includes('-'))
            })));
            
            // Only report as issue if slots are truly incomplete, not just using different field names
            const trulyIncompleteSlots = incompleteSlots.filter(slot => {
              const hasAnyId = !!(slot.id || slot.slotId || slot._id);
              const hasAnyType = !!(slot.type || slot.vehicleType);
              const hasAnyPosition = !!(slot.x !== undefined && slot.y !== undefined) || 
                                   !!(slot.id && typeof slot.id === 'string' && slot.id.includes('-')) ||
                                   !!(slot.position) || !!(slot.coordinates);
              return !(hasAnyId && hasAnyType && hasAnyPosition);
            });
            
            if (trulyIncompleteSlots.length > 0) {
              issues.push(`${trulyIncompleteSlots.length} slots have incomplete data (missing id, type, or coordinates)`);
              isValid = false;
            }
          }
        }
      }

      if (!property.layoutData.templateName && !property.layoutData.name) {
        issues.push("Layout data missing template name");
        isValid = false;
      }

      // Check if slot counts match
      const layoutSlotCount = property.layoutData.slots ? 
        (Array.isArray(property.layoutData.slots) ? 
          property.layoutData.slots.length : 
          Object.keys(property.layoutData.slots).length) : 0;
      const propertySlotCount = (property.carSlots || 0) + (property.bikeSlots || 0);
      
      console.log("🔢 Slot count comparison:", {
        layoutSlots: layoutSlotCount,
        propertySlots: propertySlotCount
      });
      
      if (layoutSlotCount !== propertySlotCount) {
        issues.push(`Slot count mismatch: Layout has ${layoutSlotCount} slots, property declares ${propertySlotCount} slots`);
        isValid = false;
      }
    }

    return {
      isValid,
      issues,
      step: currentStep,
      propertyId: property._id,
      propertyName: property.name,
      summary: `${issues.length} layout issues found at ${currentStep}`
    };
  };

  // We intentionally do not render any UI for layout validation.
  // All details are logged to the console for debugging purposes only.
  return null;
};

export default LayoutConsistencyChecker;