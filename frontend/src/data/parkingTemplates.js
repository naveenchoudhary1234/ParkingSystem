// Dynamic Parking Layout Generator for Visual Selection
export const slotStatus = {
  AVAILABLE: 'available',
  BOOKED: 'booked',
  UNAVAILABLE: 'unavailable'
};

export const vehicleTypes = {
  CAR: 'car',
  BIKE: 'bike'
};

// Safety function to prevent out-of-bounds array access
const safeSetLayout = (layout, row, col, value) => {
  if (layout[row] && col >= 0 && col < layout[row].length) {
    layout[row][col] = value;
    return true;
  }
  console.warn(`Layout bounds exceeded: row ${row}, col ${col}`);
  return false;
};

// Generate all available templates for given slot numbers
export const generateAllTemplates = (carSlots, bikeSlots, pricePerHour = 20) => {
  return parkingTemplateCategories.map(category => {
    return generateDynamicTemplate(category.id, carSlots, bikeSlots, pricePerHour);
  });
};

// Dynamic Template Generators
export const generateDynamicTemplate = (templateType, carSlots, bikeSlots, pricePerHour = 20) => {
  const totalSlots = carSlots + bikeSlots;
  
  switch (templateType) {
    case 'efficient-grid':
      return generateEfficientGrid(carSlots, bikeSlots, pricePerHour);
    case 'linear-flow':
      return generateLinearFlow(carSlots, bikeSlots, pricePerHour);
    case 'circular-flow':
      return generateCircularFlow(carSlots, bikeSlots, pricePerHour);
    case 'separated-zones':
      return generateSeparatedZones(carSlots, bikeSlots, pricePerHour);
    case 'mall-style':
      return generateMallStyle(carSlots, bikeSlots, pricePerHour);
    case 'compact-urban':
      return generateCompactUrban(carSlots, bikeSlots, pricePerHour);
    default:
      return generateEfficientGrid(carSlots, bikeSlots, pricePerHour);
  }
};

// 1. Drive-Through Layout - Every car can exit easily
const generateEfficientGrid = (carSlots, bikeSlots, pricePerHour = 20) => {
  const totalSlots = carSlots + bikeSlots;
  const slotsPerRow = 8; // Smaller rows for easy exit
  const aisles = Math.ceil(totalSlots / (slotsPerRow * 2)); // 2 rows per aisle
  
  const rows = aisles * 4; // 2 parking rows + 2 driving lanes per aisle
  const cols = slotsPerRow + 4; // +4 for wide entry/exit roads
  
  const layout = Array(rows).fill(null).map(() => Array(cols).fill(0));
  const slots = {};
  let slotCount = 0;
  
  // Create entry road (left side)
  for (let row = 0; row < rows; row++) {
    layout[row][0] = 2; // Entry road
    layout[row][1] = 2; // Wide entry
  }
  
  // Create exit road (right side)
  for (let row = 0; row < rows; row++) {
    layout[row][cols - 1] = 3; // Exit road
    layout[row][cols - 2] = 3; // Wide exit
  }
  
  for (let aisle = 0; aisle < aisles && slotCount < totalSlots; aisle++) {
    const startRow = aisle * 4;
    
    // Top parking row (facing down for easy exit)
    for (let col = 2; col < cols - 2 && slotCount < totalSlots; col++) {
      layout[startRow][col] = 1;
      const slotId = `${startRow}-${col}`;
      const vehicleType = slotCount < carSlots ? vehicleTypes.CAR : vehicleTypes.BIKE;
      
      slots[slotId] = {
        id: slotId,
        slotNumber: generateSlotNumber(slotCount, vehicleType),
        status: slotStatus.AVAILABLE,
        vehicleType: vehicleType,
        pricePerHour: pricePerHour,
        direction: 'down' // Car faces exit direction
      };
      slotCount++;
    }
    
    // Driving lane
    for (let col = 2; col < cols - 2; col++) {
      layout[startRow + 1][col] = 0; // Driving space
    }
    
    // Bottom parking row (facing up for easy exit)
    for (let col = 2; col < cols - 2 && slotCount < totalSlots; col++) {
      layout[startRow + 2][col] = 1;
      const slotId = `${startRow + 2}-${col}`;
      const vehicleType = slotCount < carSlots ? vehicleTypes.CAR : vehicleTypes.BIKE;
      
      slots[slotId] = {
        id: slotId,
        slotNumber: generateSlotNumber(slotCount, vehicleType),
        status: slotStatus.AVAILABLE,
        vehicleType: vehicleType,
        pricePerHour: pricePerHour,
        direction: 'up' // Car faces exit direction
      };
      slotCount++;
    }
    
    // Separator lane
    if (aisle < aisles - 1) {
      for (let col = 2; col < cols - 2; col++) {
        layout[startRow + 3][col] = 0;
      }
    }
  }
  
  return {
    id: 'efficient-grid',
    name: `Drive-Through Layout`,
    description: `Every car can exit easily! ${carSlots} cars + ${bikeSlots} bikes with wide entry/exit roads`,
    dimensions: { rows, cols },
    entryExit: { entry: "🟢 LEFT SIDE (Wide Entry)", exit: "🔴 RIGHT SIDE (Wide Exit)" },
    layout: layout,
    slots: slots,
    totalSlots: totalSlots,
    carSlots: carSlots,
    bikeSlots: bikeSlots,
    icon: "🟢→🚗🚗🚗→🔴\n   ⬇️ ⬆️ ⬇️\n🟢→🚗🚗🚗→🔴"
  };
};

// 2. One-Way Flow Layout - Like mall parking with clear direction
const generateLinearFlow = (carSlots, bikeSlots, pricePerHour = 20) => {
  const totalSlots = carSlots + bikeSlots;
  const slotsPerAisle = 10; // 10 cars per aisle
  const aisles = Math.ceil(totalSlots / slotsPerAisle);
  
  const rows = aisles * 2 + 4; // Each aisle + driving lanes + entry/exit
  const cols = slotsPerAisle + 6; // Slots + wide roads
  
  const layout = Array(rows).fill(null).map(() => Array(cols).fill(0));
  const slots = {};
  let slotCount = 0;
  
  // Create MAIN ENTRY road at top
  for (let col = 0; col < cols; col++) {
    layout[0][col] = 2; // Green entry road
    layout[1][col] = 2;
  }
  
  // Create MAIN EXIT road at bottom
  for (let col = 0; col < cols; col++) {
    layout[rows - 1][col] = 3; // Red exit road
    layout[rows - 2][col] = 3;
  }
  
  // Create one-way flow aisles
  for (let aisle = 0; aisle < aisles && slotCount < totalSlots; aisle++) {
    const aisleRow = 2 + aisle * 2;
    
    // Create diagonal parking slots (45° angle)
    for (let col = 3; col < cols - 3 && slotCount < totalSlots; col++) {
      layout[aisleRow][col] = 1;
      const slotId = `${aisleRow}-${col}`;
      const vehicleType = slotCount < carSlots ? vehicleTypes.CAR : vehicleTypes.BIKE;
      
      slots[slotId] = {
        id: slotId,
        slotNumber: generateSlotNumber(slotCount, vehicleType),
        status: slotStatus.AVAILABLE,
        vehicleType: vehicleType,
        pricePerHour: pricePerHour,
        direction: 'diagonal-exit' // 45° angle for easy exit
      };
      slotCount++;
    }
    
    // One-way driving lane (right to left)
    for (let col = 3; col < cols - 3; col++) {
      layout[aisleRow + 1][col] = 0;
    }
  }
  
  // Create direction arrows in driving lanes
  for (let aisle = 0; aisle < aisles; aisle++) {
    const aisleRow = 2 + aisle * 2 + 1;
    layout[aisleRow][1] = 4; // Arrow indicator
    layout[aisleRow][2] = 4;
  }
  
  return {
    id: 'linear-flow',
    name: `One-Way Mall Style`,
    description: `Like shopping mall parking! ${carSlots} cars + ${bikeSlots} bikes. Enter top ⬇️, drive around, exit bottom ⬆️`,
    dimensions: { rows, cols },
    entryExit: { entry: "🟢 TOP ENTRANCE (Main Entry)", exit: "🔴 BOTTOM EXIT (Main Exit)" },
    layout: layout,
    slots: slots,
    totalSlots: totalSlots,
    carSlots: carSlots,
    bikeSlots: bikeSlots,
    icon: "🟢🟢🟢ENTRY🟢🟢🟢\n➡️🚗🚗🚗🚗➡️\n➡️🚗🚗🚗🚗➡️\n🔴🔴🔴EXIT🔴🔴🔴"
  };
};

// 3. Roundabout Layout - Central roundabout with easy access
const generateCircularFlow = (carSlots, bikeSlots, pricePerHour = 20) => {
  const totalSlots = carSlots + bikeSlots;
  const size = Math.max(20, Math.ceil(Math.sqrt(totalSlots / 2)) + 8);
  const rows = size;
  const cols = size;
  
  const layout = Array(rows).fill(null).map(() => Array(cols).fill(0));
  const slots = {};
  let slotCount = 0;
  
  const centerRow = Math.floor(rows / 2);
  const centerCol = Math.floor(cols / 2);
  const outerRadius = Math.floor(size / 2) - 2;
  const innerRadius = Math.floor(size / 4);
  
  // Create entry points at cardinal directions
  const entryPoints = [
    { row: 0, col: centerCol, type: 2 }, // Top entry
    { row: rows - 1, col: centerCol, type: 3 }, // Bottom exit
    { row: centerRow, col: 0, type: 2 }, // Left entry
    { row: centerRow, col: cols - 1, type: 3 }, // Right exit
  ];
  
  // Mark entry/exit points
  entryPoints.forEach(point => {
    layout[point.row][point.col] = point.type;
    // Make wider entry/exit
    if (point.row === 0 || point.row === rows - 1) {
      if (point.col > 0) layout[point.row][point.col - 1] = point.type;
      if (point.col < cols - 1) layout[point.row][point.col + 1] = point.type;
    } else {
      if (point.row > 0) layout[point.row - 1][point.col] = point.type;
      if (point.row < rows - 1) layout[point.row + 1][point.col] = point.type;
    }
  });
  
  // Create parking slots in concentric rings
  for (let angle = 0; angle < 360 && slotCount < totalSlots; angle += 15) {
    const rad = (angle * Math.PI) / 180;
    
    // Outer ring parking
    const outerRow = Math.round(centerRow + outerRadius * Math.sin(rad));
    const outerCol = Math.round(centerCol + outerRadius * Math.cos(rad));
    
    if (outerRow >= 2 && outerRow < rows - 2 && outerCol >= 2 && outerCol < cols - 2 && slotCount < totalSlots) {
      layout[outerRow][outerCol] = 1;
      const slotId = `${outerRow}-${outerCol}`;
      const vehicleType = slotCount < carSlots ? vehicleTypes.CAR : vehicleTypes.BIKE;
      
      slots[slotId] = {
        id: slotId,
        slotNumber: generateSlotNumber(slotCount, vehicleType),
        status: slotStatus.AVAILABLE,
        vehicleType: vehicleType,
        pricePerHour: pricePerHour,
        direction: 'facing-center' // Cars face the roundabout
      };
      slotCount++;
    }
    
    // Inner ring parking (if space allows)
    if (slotCount < totalSlots && angle % 30 === 0) {
      const innerRow = Math.round(centerRow + (innerRadius + 3) * Math.sin(rad));
      const innerCol = Math.round(centerCol + (innerRadius + 3) * Math.cos(rad));
      
      if (innerRow >= 2 && innerRow < rows - 2 && innerCol >= 2 && innerCol < cols - 2) {
        layout[innerRow][innerCol] = 1;
        const slotId = `${innerRow}-${innerCol}`;
        const vehicleType = slotCount < carSlots ? vehicleTypes.CAR : vehicleTypes.BIKE;
        
        slots[slotId] = {
          id: slotId,
          slotNumber: generateSlotNumber(slotCount, vehicleType),
          status: slotStatus.AVAILABLE,
          vehicleType: vehicleType,
          pricePerHour: pricePerHour,
          direction: 'facing-out' // Cars face outward for easy exit
        };
        slotCount++;
      }
    }
  }
  
  // Create central roundabout driving area
  for (let row = centerRow - innerRadius; row <= centerRow + innerRadius; row++) {
    for (let col = centerCol - innerRadius; col <= centerCol + innerRadius; col++) {
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        const distance = Math.sqrt((row - centerRow) ** 2 + (col - centerCol) ** 2);
        if (distance <= innerRadius && layout[row][col] === 0) {
          layout[row][col] = 0; // Driving space
        }
      }
    }
  }
  
  return {
    id: 'circular-flow',
    name: `Roundabout Style`,
    description: `Central roundabout design! ${carSlots} cars + ${bikeSlots} bikes. Enter from 4 sides, circle around, easy exit!`,
    dimensions: { rows, cols },
    entryExit: { entry: "🟢 TOP & LEFT (Multiple Entries)", exit: "🔴 BOTTOM & RIGHT (Multiple Exits)" },
    layout: layout,
    slots: slots,
    totalSlots: totalSlots,
    carSlots: carSlots,
    bikeSlots: bikeSlots,
    icon: "🟢 🚗🚗🚗 🔴\n🚗  ⭕  🚗\n🟢 🚗🚗🚗 🔴"
  };
};

// 4. Airport Style Layout - Premium design with drive lanes
const generateSeparatedZones = (carSlots, bikeSlots, pricePerHour = 20) => {
  const totalSlots = carSlots + bikeSlots;
  const carRows = Math.ceil(carSlots / 8); // 8 cars per row
  const bikeRows = Math.ceil(bikeSlots / 12); // 12 bikes per row
  
  // Calculate proper row count: 3 entry + carRows*2 + 1 separation + bikeRows*2 + 3 exit
  const rows = 3 + (carRows * 2) + 1 + (bikeRows * 2) + 3;
  const cols = Math.max(12, 16); // Wide layout
  
  const layout = Array(rows).fill(null).map(() => Array(cols).fill(0));
  const slots = {};
  let slotCount = 0;
  
  // CREATE MAIN ENTRY BOULEVARD (top)
  for (let col = 0; col < cols; col++) {
    layout[0][col] = 2; // Green entry road
    layout[1][col] = 2;
    layout[2][col] = 2; // Triple wide entry
  }
  
  // CREATE MAIN EXIT BOULEVARD (bottom)
  for (let col = 0; col < cols; col++) {
    layout[rows - 1][col] = 3; // Red exit road
    layout[rows - 2][col] = 3;
    layout[rows - 3][col] = 3; // Triple wide exit
  }
  
  // CAR ZONE (Premium area)
  let currentRow = 3;
  for (let row = 0; row < carRows && slotCount < carSlots; row++) {
    // Create car parking with drive-through access
    for (let col = 2; col < cols - 2 && slotCount < carSlots; col++) {
      layout[currentRow][col] = 1;
      const slotId = `${currentRow}-${col}`;
      
      slots[slotId] = {
        id: slotId,
        slotNumber: generateSlotNumber(slotCount, vehicleTypes.CAR),
        status: slotStatus.AVAILABLE,
        vehicleType: vehicleTypes.CAR,
        pricePerHour: pricePerHour,
        zone: 'premium-car',
        direction: 'pull-through' // Can drive straight through
      };
      slotCount++;
    }
    currentRow++;
    
    // Drive lane after each parking row
    for (let col = 2; col < cols - 2; col++) {
      layout[currentRow][col] = 0; // Wide driving lane
    }
    currentRow++;
  }
  
  // SEPARATION BOULEVARD
  for (let col = 0; col < cols; col++) {
    if (currentRow < rows) {
      layout[currentRow][col] = 4; // Yellow separation zone
    } else {
      console.warn(`Separation boulevard: currentRow ${currentRow} exceeds rows ${rows}`);
    }
  }
  currentRow++;
  
  // BIKE ZONE (Compact area)
  slotCount = 0; // Reset for bikes
  for (let row = 0; row < bikeRows && slotCount < bikeSlots; row++) {
    // Create bike parking with easy access
    for (let col = 1; col < cols - 1 && slotCount < bikeSlots; col++) {
      if (currentRow < rows) {
        layout[currentRow][col] = 1;
        const slotId = `${currentRow}-${col}`;
        
        slots[slotId] = {
          id: slotId,
          slotNumber: generateSlotNumber(slotCount, vehicleTypes.BIKE),
          status: slotStatus.AVAILABLE,
          vehicleType: vehicleTypes.BIKE,
          pricePerHour: pricePerHour,
          zone: 'bike-zone',
          direction: 'any-direction' // Bikes can exit any way
        };
        slotCount++;
      } else {
        console.warn(`Bike zone: currentRow ${currentRow} exceeds rows ${rows}`);
        break; // Stop if we exceed bounds
      }
    }
    currentRow++;
    
    // Narrow drive lane for bikes
    if (row < bikeRows - 1 && currentRow < rows) {
      for (let col = 1; col < cols - 1; col++) {
        layout[currentRow][col] = 0;
      }
      currentRow++;
    }
  }
  
  return {
    id: 'separated-zones',
    name: `Airport Style Premium`,
    description: `Like airport parking! ${carSlots} cars (premium zone) + ${bikeSlots} bikes (compact zone). Wide boulevards for easy navigation!`,
    dimensions: { rows, cols },
    entryExit: { entry: "🟢 MAIN ENTRANCE BOULEVARD (Top)", exit: "🔴 MAIN EXIT BOULEVARD (Bottom)" },
    layout: layout,
    slots: slots,
    totalSlots: totalSlots,
    carSlots: carSlots,
    bikeSlots: bikeSlots,
    icon: "🟢🟢MAIN ENTRY🟢🟢\n🚗🚗 PREMIUM 🚗🚗\n━━━━━━━━━━━━━━\n🏍️🏍️ COMPACT 🏍️🏍️\n🔴🔴MAIN EXIT🔴🔴"
  };
};

// 5. Mall Style Layout - Multiple levels and wide aisles
const generateMallStyle = (carSlots, bikeSlots, pricePerHour = 20) => {
  const totalSlots = carSlots + bikeSlots;
  const aisleWidth = 2;
  const slotsPerAisle = Math.min(12, Math.ceil(totalSlots / 4));
  const aisles = Math.ceil(totalSlots / slotsPerAisle);
  
  const rows = aisles * 3 + (aisles - 1) * aisleWidth; // 3 rows per aisle + aisle spacing
  const cols = slotsPerAisle + 4; // Extra space for circulation
  
  const layout = Array(rows).fill(null).map(() => Array(cols).fill(0));
  const slots = {};
  let slotCount = 0;
  
  for (let aisle = 0; aisle < aisles && slotCount < totalSlots; aisle++) {
    const startRow = aisle * (3 + aisleWidth);
    
    // Top row of aisle
    for (let col = 1; col < cols - 1 && slotCount < totalSlots; col++) {
      layout[startRow][col] = 1;
      const slotId = `${startRow}-${col}`;
      const vehicleType = slotCount < carSlots ? vehicleTypes.CAR : vehicleTypes.BIKE;
      
      slots[slotId] = {
        id: slotId,
        slotNumber: generateSlotNumber(slotCount, vehicleType),
        status: slotStatus.AVAILABLE,
        vehicleType: vehicleType,
        pricePerHour: pricePerHour
      };
      slotCount++;
    }
    
    // Bottom row of aisle
    for (let col = 1; col < cols - 1 && slotCount < totalSlots; col++) {
      layout[startRow + 2][col] = 1;
      const slotId = `${startRow + 2}-${col}`;
      const vehicleType = slotCount < carSlots ? vehicleTypes.CAR : vehicleTypes.BIKE;
      
      slots[slotId] = {
        id: slotId,
        slotNumber: generateSlotNumber(slotCount, vehicleType),
        status: slotStatus.AVAILABLE,
        vehicleType: vehicleType,
        pricePerHour: pricePerHour
      };
      slotCount++;
    }
  }
  
  return {
    id: 'mall-style',
    name: `Mall Style Layout`,
    description: `Shopping mall style with wide aisles for ${carSlots} cars and ${bikeSlots} bikes`,
    dimensions: { rows, cols },
    entryExit: { entry: "center-bottom", exit: "center-bottom" },
    layout: layout,
    slots: slots,
    totalSlots: totalSlots,
    carSlots: carSlots,
    bikeSlots: bikeSlots,
    icon: "🚗🚗🚗\n━━━━━\n🚗🚗🚗\n━━━━━\n🚗🚗🚗"
  };
};

// 6. Compact Urban Layout - Maximum density
const generateCompactUrban = (carSlots, bikeSlots, pricePerHour = 20) => {
  const totalSlots = carSlots + bikeSlots;
  const cols = Math.min(25, Math.ceil(Math.sqrt(totalSlots * 1.2)));
  const rows = Math.ceil(totalSlots / cols) + 1;
  
  const layout = Array(rows).fill(null).map(() => Array(cols).fill(0));
  const slots = {};
  let slotCount = 0;
  
  // Compact arrangement with minimal driving space
  for (let row = 0; row < rows && slotCount < totalSlots; row++) {
    for (let col = 0; col < cols && slotCount < totalSlots; col++) {
      // Leave some space for minimal driving lanes
      if (row % 3 === 1 && col % 5 === 2) continue;
      
      layout[row][col] = 1;
      const slotId = `${row}-${col}`;
      const vehicleType = slotCount < carSlots ? vehicleTypes.CAR : vehicleTypes.BIKE;
      
      slots[slotId] = {
        id: slotId,
        slotNumber: generateSlotNumber(slotCount, vehicleType),
        status: slotStatus.AVAILABLE,
        vehicleType: vehicleType,
        pricePerHour: pricePerHour
      };
      slotCount++;
    }
  }
  
  return {
    id: 'compact-urban',
    name: `Compact Urban Layout`,
    description: `High-density urban arrangement for ${carSlots} cars and ${bikeSlots} bikes`,
    dimensions: { rows, cols },
    entryExit: { entry: "multiple", exit: "multiple" },
    layout: layout,
    slots: slots,
    totalSlots: totalSlots,
    carSlots: carSlots,
    bikeSlots: bikeSlots,
    icon: "🚗🚗🚗🚗🚗\n🚗🚗🚗🚗🚗\n🚗🚗🚗🚗🚗"
  };
};

// Helper function to generate slot numbers
const generateSlotNumber = (index, vehicleType) => {
  const prefix = vehicleType === vehicleTypes.CAR ? 'C' : 'B';
  const number = (index + 1).toString().padStart(2, '0');
  return `${prefix}${number}`;
};

// Template categories for easy selection
export const parkingTemplateCategories = [
  {
    id: 'efficient-grid',
    name: 'Drive-Through Easy',
    description: 'Every car can exit easily! No one gets trapped in the middle.',
    icon: '🚗➡️',
    bestFor: 'Busy areas where cars need quick exit'
  },
  {
    id: 'linear-flow', 
    name: 'One-Way Mall Style',
    description: 'Like shopping mall parking - enter top, drive around, exit bottom',
    icon: '🛣️',
    bestFor: 'Large spaces, smooth traffic flow'
  },
  {
    id: 'circular-flow',
    name: 'Circular Flow', 
    description: 'Smooth circular traffic with central access',
    icon: '�',
    bestFor: 'Open areas, plazas, roundabouts'
  },
  {
    id: 'separated-zones',
    name: 'Airport Premium Style',
    description: 'Luxury layout with wide boulevards and separate car/bike zones',
    icon: '✈️',
    bestFor: 'Premium locations, organized vehicle separation'
  }
];

// Legacy templates array for backward compatibility
export const parkingTemplates = [];