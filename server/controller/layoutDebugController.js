const ParkingProperty = require("../model/ParkingProperty");

// Debug endpoint to check layout data consistency throughout the flow
exports.debugLayoutConsistency = async (req, res) => {
  try {
    const { id } = req.params; // Changed from propertyId to id to match route pattern
    
    console.log("🔍 Debug Layout Consistency - Property ID:", id);
    
    // Validate property ID format
    if (!id || id.length !== 24) {
      console.error("❌ Invalid property ID format:", id);
      return res.status(400).json({ 
        error: "Invalid property ID format",
        received: id,
        expected: "24-character MongoDB ObjectId"
      });
    }
    
    // Get the specific property
    const property = await ParkingProperty.findById(id);
    console.log("📋 Property found:", !!property);
    
    if (!property) {
      console.error("❌ Property not found with ID:", id);
      
      // Let's also check if property exists with different case or format
      const allProperties = await ParkingProperty.find({}).select('_id name');
      console.log("📊 Available properties:", allProperties.map(p => ({ id: p._id, name: p.name })));
      
      return res.status(404).json({ 
        error: "Property not found",
        searchedId: id,
        availableProperties: allProperties.length,
        suggestion: "Check if the property ID is correct and the property exists"
      });
    }
    
    console.log("✅ Property found:", property.name);
    
    // Analyze layout data
    const analysis = {
      propertyId: property._id,
      propertyName: property.name,
      approved: property.approved,
      hasLayoutData: !!property.layoutData,
      layoutDataSize: property.layoutData ? JSON.stringify(property.layoutData).length : 0,
      layoutAnalysis: {}
    };
    
    if (property.layoutData) {
      analysis.layoutAnalysis = {
        hasSlots: !!property.layoutData.slots,
        slotsCount: property.layoutData.slots ? Object.keys(property.layoutData.slots).length : 0,
        templateName: property.layoutData.templateName || "Not specified",
        hasGridSize: !!(property.layoutData.gridWidth && property.layoutData.gridHeight),
        gridDimensions: property.layoutData.gridWidth && property.layoutData.gridHeight ? 
          `${property.layoutData.gridWidth}x${property.layoutData.gridHeight}` : "Not specified",
        slotTypes: property.layoutData.slots ? 
          [...new Set(Object.values(property.layoutData.slots).map(slot => slot.type))] : []
      };
      
      // Validate slot data consistency
      if (property.layoutData.slots) {
        const slots = Object.values(property.layoutData.slots);
        const incompleteSlots = slots.filter(slot => 
          !slot.id || !slot.type || slot.x === undefined || slot.y === undefined
        );
        
        analysis.layoutAnalysis.incompleteSlots = incompleteSlots.length;
        analysis.layoutAnalysis.consistencyIssues = [];
        
        // Check slot count vs property declaration
        const declaredSlots = (property.carSlots || 0) + (property.bikeSlots || 0);
        const layoutSlots = slots.length;
        
        if (declaredSlots !== layoutSlots) {
          analysis.layoutAnalysis.consistencyIssues.push(
            `Slot count mismatch: Property declares ${declaredSlots} slots, layout has ${layoutSlots} slots`
          );
        }
        
        // Check slot type distribution
        const carSlots = slots.filter(slot => slot.type === 'car').length;
        const bikeSlots = slots.filter(slot => slot.type === 'bike').length;
        
        if (carSlots !== property.carSlots) {
          analysis.layoutAnalysis.consistencyIssues.push(
            `Car slot mismatch: Property declares ${property.carSlots} car slots, layout has ${carSlots} car slots`
          );
        }
        
        if (bikeSlots !== property.bikeSlots) {
          analysis.layoutAnalysis.consistencyIssues.push(
            `Bike slot mismatch: Property declares ${property.bikeSlots} bike slots, layout has ${bikeSlots} bike slots`
          );
        }
      }
    } else {
      analysis.layoutAnalysis.consistencyIssues = ["No layout data available"];
    }
    
    // Overall consistency score
    const issues = analysis.layoutAnalysis.consistencyIssues || [];
    analysis.consistencyScore = issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 25));
    analysis.isConsistent = issues.length === 0;
    
    console.log("🔍 Layout consistency debug for property:", propertyId);
    console.log("📊 Analysis result:", analysis);
    
    res.json({
      success: true,
      analysis,
      recommendation: analysis.isConsistent ? 
        "Layout data is consistent and ready for user booking" :
        "Layout data has consistency issues that may affect user experience"
    });
    
  } catch (err) {
    console.error("Debug Layout Consistency Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};