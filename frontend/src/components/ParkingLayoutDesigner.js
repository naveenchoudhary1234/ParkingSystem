import React, { useState, useEffect } from 'react';
import { 
  generateAllTemplates, 
  parkingTemplateCategories,
  slotStatus, 
  vehicleTypes 
} from '../data/parkingTemplates';
import '../styles/parking-layout-designer.css';
import DxfImporter from './DxfImporter';

const ParkingLayoutDesigner = ({ property, onSave, onCancel, isNewProperty = false }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutData, setLayoutData] = useState([]);
  const [slotConfiguration, setSlotConfiguration] = useState({});
  const [step, setStep] = useState(1); // 1: Template Selection, 2: Slot Configuration, 3: Preview
  const [entryExit, setEntryExit] = useState({ entry: 'bottom', exit: 'bottom' });
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [designMode, setDesignMode] = useState('select'); // 'select' | 'add' | 'delete' | 'move'
  const [moveSource, setMoveSource] = useState(null);
  const [newSlotVehicleType, setNewSlotVehicleType] = useState(vehicleTypes.CAR);

  // Get slot numbers from property
  const carSlots = property?.carSlots || 0;
  const bikeSlots = property?.bikeSlots || 0;
  const pricePerHour = property?.pricePerHour || 20; // Use property's price or default to 20

  // Generate dynamic templates when component loads
  useEffect(() => {
    if (carSlots === 0 && bikeSlots === 0) return; // Skip generation if no slots
    
    const generateTemplates = async () => {
      setIsLoading(true);
      try {
        console.log(`🎯 Generating templates for ${carSlots} car slots and ${bikeSlots} bike slots at ₹${pricePerHour}/hour`);
        const templates = generateAllTemplates(carSlots, bikeSlots, pricePerHour);
        console.log(`✅ Generated ${templates.length} templates`, templates.map(t => ({ id: t.id, name: t.name, totalSlots: t.totalSlots })));
        setAvailableTemplates(templates);
      } catch (error) {
        console.error('❌ Error generating templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generateTemplates();
  }, [carSlots, bikeSlots, pricePerHour]);

  // Initialize layout when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      const template = availableTemplates.find(t => t.id === selectedTemplate);
      if (template) {
        console.log(`🎯 Selected template:`, template);
        setLayoutData(template.layout);
        setEntryExit(template.entryExit);
        setSlotConfiguration(template.slots);
      }
    }
  }, [selectedTemplate, availableTemplates]);

  // Check if we have valid slot numbers
  if (carSlots === 0 && bikeSlots === 0) {
    return (
      <div className="parking-layout-designer">
        <div className="designer-header">
          <h2>⚠️ No Parking Slots Specified</h2>
          <p>Please go back and specify the number of car and bike slots for your parking space.</p>
        </div>
        <div className="error-container">
          <div className="error-message">
            <p>🚗 Car Slots: {carSlots}</p>
            <p>🏍️ Bike Slots: {bikeSlots}</p>
            <p>You need at least one type of parking slot to design a layout.</p>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={onCancel}>
              ← Go Back to Enter Slot Numbers
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleTemplateSelect = (templateId) => {
    console.log("🎯 Template selected:", templateId);
    console.log("🔍 Available templates:", availableTemplates.map(t => ({ id: t.id, name: t.name })));
    setSelectedTemplate(templateId);
    setStep(2);
  };

  const toggleSlotStatus = (slotId) => {
    setSlotConfiguration(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        status: prev[slotId].status === slotStatus.AVAILABLE 
          ? slotStatus.UNAVAILABLE 
          : slotStatus.AVAILABLE
      }
    }));
  };

  const toggleSlotVehicleType = (slotId) => {
    setSlotConfiguration(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        vehicleType: prev[slotId].vehicleType === vehicleTypes.CAR 
          ? vehicleTypes.BIKE 
          : vehicleTypes.CAR
      }
    }));
  };

  const addSlotAt = (row, col) => {
    const slotId = `${row}-${col}`;
    setLayoutData(prev => {
      const copy = prev.map(r => r.slice());
      copy[row][col] = 1;
      return copy;
    });
    setSlotConfiguration(prev => {
      if (prev[slotId]) return prev;
      const next = { ...prev };
      const slotNumber = `S${Object.keys(next).length + 1}`;
      next[slotId] = { slotNumber, status: slotStatus.AVAILABLE, vehicleType: newSlotVehicleType };
      return next;
    });
  };

  const deleteSlotAt = (slotId) => {
    const [r, c] = slotId.split('-').map(Number);
    setLayoutData(prev => {
      const copy = prev.map(row => row.slice());
      if (copy[r]) copy[r][c] = 0;
      return copy;
    });
    setSlotConfiguration(prev => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handleCellClick = (rowIndex, colIndex) => {
    const id = `${rowIndex}-${colIndex}`;
    if (designMode === 'add') {
      // add slot if empty
      if (!slotConfiguration[id]) addSlotAt(rowIndex, colIndex);
      return;
    }

    if (designMode === 'delete') {
      if (slotConfiguration[id]) deleteSlotAt(id);
      return;
    }

    if (designMode === 'move') {
      if (moveSource) {
        // finish move
        if (!slotConfiguration[id]) {
          // move slot
          setSlotConfiguration(prev => {
            const next = { ...prev };
            next[id] = { ...next[moveSource], slotNumber: next[moveSource].slotNumber };
            delete next[moveSource];
            return next;
          });
          const [sr, sc] = moveSource.split('-').map(Number);
          setLayoutData(prev => {
            const copy = prev.map(r => r.slice());
            if (copy[sr]) copy[sr][sc] = 0;
            if (copy[rowIndex]) copy[rowIndex][colIndex] = 1;
            return copy;
          });
        }
        setMoveSource(null);
        setDesignMode('select');
      } else {
        // start move by clicking a slot (handled in slot click)
      }
      return;
    }

    // default select mode: do nothing for empty cells
  };

  const handleSaveLayout = () => {
    const template = availableTemplates.find(t => t.id === selectedTemplate) || null;
    const layoutConfig = {
      templateId: selectedTemplate,
      templateName: template ? template.name : (selectedTemplate === 'dxf-import' ? 'DXF Imported Layout' : (selectedTemplate === 'manual-blank' ? 'Manual Layout' : 'Custom Layout')),
      layout: layoutData,
      slots: slotConfiguration,
      entryExit: entryExit,
      dimensions: template ? template.dimensions : { rows: layoutData.length, cols: layoutData[0]?.length || 0 },
      totalSlots: Object.keys(slotConfiguration).length,
      availableSlots: Object.values(slotConfiguration).filter(s => s.status === slotStatus.AVAILABLE).length,
      carSlots: Object.values(slotConfiguration).filter(s => s.vehicleType === vehicleTypes.CAR).length,
      bikeSlots: Object.values(slotConfiguration).filter(s => s.vehicleType === vehicleTypes.BIKE).length
    };
    
    console.log("💾 Saving layout config:", layoutConfig);
    onSave(layoutConfig);
  };

  const getSlotClass = (slot) => {
    let classes = ['parking-slot'];
    classes.push(`slot-${slot.status}`);
    classes.push(`vehicle-${slot.vehicleType}`);
    return classes.join(' ');
  };

  const filteredSlots = Object.values(slotConfiguration).filter(slot => {
    if (vehicleTypeFilter === 'all') return true;
    return slot.vehicleType === vehicleTypeFilter;
  });

  if (isLoading) {
    return (
      <div className="parking-layout-designer">
        <div className="designer-header">
          <h2>🚀 Generating Custom Layouts</h2>
          <p>Creating optimized layouts for {carSlots} car slots and {bikeSlots} bike slots...</p>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Please wait while we generate the best layouts for your space</p>
        </div>
      </div>
    );
  }

  if (step === 1) {
    // Template Selection Step
    return (
      <div className="parking-layout-designer">
        <div className="designer-header">
          <h2>🎯 Choose Your Parking Layout</h2>
          <p>Select from custom layouts designed for <strong>{carSlots} car slots</strong> and <strong>{bikeSlots} bike slots</strong></p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }} />
          {/* DXF Importer - will populate layoutData when user uploads a dxf */}
          <DxfImporter onParse={(layout) => {
            console.log('📐 DXF parsed', layout);
            // Simple conversion: map all polylines into a grid bounding box
            try {
              const allPoints = [].concat(...layout.polylines);
              const xs = allPoints.map(p => p.x);
              const ys = allPoints.map(p => p.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              // define grid size heuristic based on aspect
              const cols = Math.min(20, Math.max(6, Math.round((maxX - minX) / Math.max(1, (maxY - minY)) * 8)));
              const rows = Math.min(20, Math.max(6, Math.round((maxY - minY) / Math.max(1, (maxX - minX)) * 8)));
              // initialize empty layout (0=road/empty)
              const newLayout = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
              const newSlots = {};
              let slotCounter = 1;

              // Map each polyline point to nearest grid cell and mark as a slot
              layout.polylines.forEach(poly => {
                poly.forEach(pt => {
                  const cx = Math.floor(((pt.x - minX) / (maxX - minX || 1)) * (cols - 1));
                  const cy = Math.floor(((pt.y - minY) / (maxY - minY || 1)) * (rows - 1));
                  if (newLayout[cy] && newLayout[cy][cx] === 0) {
                    newLayout[cy][cx] = 1; // mark slot cell
                    const id = `${cy}-${cx}`;
                    newSlots[id] = {
                      slotNumber: `S${slotCounter++}`,
                      status: slotStatus.AVAILABLE,
                      vehicleType: vehicleTypes.CAR
                    };
                  }
                });
              });

              // If no slots found, fallback to first available generated template
              if (Object.keys(newSlots).length === 0 && availableTemplates.length) {
                const t = availableTemplates[0];
                setSelectedTemplate(t.id);
                setLayoutData(t.layout);
                setSlotConfiguration(t.slots);
              } else {
                setLayoutData(newLayout);
                setSlotConfiguration(newSlots);
                setSelectedTemplate('dxf-import');
                setStep(2);
              }
            } catch (err) {
              console.error('DXF conversion error', err);
              alert('Could not convert DXF into a layout automatically. Please try a different file or edit manually.');
            }
          }} />
        </div>

        <div className="template-categories">
          {parkingTemplateCategories.map((category) => {
            const template = availableTemplates.find(t => t.id === category.id);
            if (!template) return null;

            return (
              <div
                key={category.id}
                className="template-category"
                onClick={() => handleTemplateSelect(template.id)}
              >
                <div className="category-header">
                  <span className="category-icon">{category.icon}</span>
                  <div className="category-info">
                    <h3>{category.name}</h3>
                    <p className="category-description">{category.description}</p>
                    <span className="best-for">Best for: {category.bestFor}</span>
                  </div>
                </div>
                
                <div className="template-preview">
                  <div 
                    className="parking-grid-preview"
                    style={{
                      gridTemplateRows: `repeat(${template.dimensions.rows}, 1fr)`,
                      gridTemplateColumns: `repeat(${template.dimensions.cols}, 1fr)`,
                      aspectRatio: `${template.dimensions.cols}/${template.dimensions.rows}`
                    }}
                  >
                    {template.layout.map((row, rowIndex) =>
                      row.map((cell, colIndex) => {
                        const slotId = `${rowIndex}-${colIndex}`;
                        const slotData = template.slots[slotId];
                        
                        if (cell === 1 && slotData) {
                          // Parking slot - Use property's price in title
                          return (
                            <div 
                              key={slotId}
                              className={`slot-preview ${slotData.vehicleType}`}
                              title={`${slotData.slotNumber} - ${slotData.vehicleType === vehicleTypes.CAR ? 'Car' : 'Bike'} Slot - ₹${pricePerHour}/hr`}
                            >
                              {slotData.vehicleType === vehicleTypes.CAR ? '🚗' : '🏍️'}
                            </div>
                          );
                        } else if (cell === 2) {
                          // Entry road (green)
                          return (
                            <div 
                              key={slotId} 
                              className="entry-road-preview"
                              title="Entry Road"
                            />
                          );
                        } else if (cell === 3) {
                          // Exit road (red)
                          return (
                            <div 
                              key={slotId} 
                              className="exit-road-preview"
                              title="Exit Road"
                            />
                          );
                        } else if (cell === 4) {
                          // Separation zone (yellow)
                          return (
                            <div 
                              key={slotId} 
                              className="separation-zone-preview"
                              title="Separation Zone"
                            />
                          );
                        } else if (cell === 0) {
                          // Driving lane
                          return (
                            <div 
                              key={slotId} 
                              className="driving-lane-preview"
                              title="Driving Lane"
                            />
                          );
                        } else {
                          // Empty space
                          return (
                            <div 
                              key={slotId} 
                              className="empty-space-preview"
                            />
                          );
                        }
                      })
                    )}
                  </div>
                </div>
                
                <div className="template-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value">{template.totalSlots}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Cars:</span>
                    <span className="stat-value">{template.carSlots}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Bikes:</span>
                    <span className="stat-value">{template.bikeSlots}</span>
                  </div>
                </div>
                
                <div className="template-features">
                  <span className="entry-exit">Entry: {template.entryExit.entry}</span>
                  <span className="entry-exit">Exit: {template.entryExit.exit}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="designer-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    // Slot Configuration Step
    return (
      <div className="parking-layout-designer">
        <div className="designer-header">
          <h2>🔧 Configure Your Parking Slots</h2>
          <p>Click slots to toggle availability, right-click to change vehicle type</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.8rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className={`btn ${designMode === 'select' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDesignMode('select')}>Select</button>
            <button className={`btn ${designMode === 'add' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDesignMode('add')}>Add Slot</button>
            <button className={`btn ${designMode === 'delete' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDesignMode('delete')}>Delete Slot</button>
            <button className={`btn ${designMode === 'move' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setDesignMode('move'); setMoveSource(null); }}>Move Slot</button>
          </div>

          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dark)', marginRight: 6 }}>New slot:</span>
            <button
              className={`btn ${newSlotVehicleType === vehicleTypes.CAR ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setNewSlotVehicleType(vehicleTypes.CAR)}
            >Car</button>
            <button
              className={`btn ${newSlotVehicleType === vehicleTypes.BIKE ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setNewSlotVehicleType(vehicleTypes.BIKE)}
            >Bike</button>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-outline" onClick={() => {
              // Create blank grid heuristic
              const blankRows = Math.max(6, (property?.carSlots || 6) + Math.ceil((property?.bikeSlots || 0) / 4));
              const blankCols = Math.max(8, Math.ceil((property?.carSlots || 6) / 4) + 4);
              const blankLayout = Array.from({ length: blankRows }, () => Array.from({ length: blankCols }, () => 0));
              setLayoutData(blankLayout);
              setSlotConfiguration({});
              setSelectedTemplate('manual-blank');
            }}>Create Layout Manually</button>
          </div>
        </div>

        <div className="configuration-panel">
          <div className="config-controls">
            <div className="filter-controls">
              <label>Show:</label>
              <select 
                value={vehicleTypeFilter} 
                onChange={(e) => setVehicleTypeFilter(e.target.value)}
              >
                <option value="all">All Slots</option>
                <option value="car">Car Slots Only</option>
                <option value="bike">Bike Slots Only</option>
              </select>
            </div>
            
            <div className="legend">
              <div className="legend-item">
                <div className="legend-color available"></div>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <div className="legend-color unavailable"></div>
                <span>Unavailable</span>
              </div>
              <div className="legend-item">
                <div className="legend-color car"></div>
                <span>Car Slot</span>
              </div>
              <div className="legend-item">
                <div className="legend-color bike"></div>
                <span>Bike Slot</span>
              </div>
            </div>
          </div>

          <div className="layout-preview">
            <div className="parking-grid" style={{
              gridTemplateRows: `repeat(${layoutData.length}, 1fr)`,
              gridTemplateColumns: `repeat(${layoutData[0]?.length || 1}, 1fr)`
            }}>
              {layoutData.map((row, rowIndex) => 
                row.map((cell, colIndex) => {
                  const slotId = `${rowIndex}-${colIndex}`;
                  const slot = slotConfiguration[slotId];
                  const isMoveSource = moveSource === slotId;

                      const cellProps = {
                        onClick: () => {
                          // design mode handler
                          handleCellClick(rowIndex, colIndex);
                          // fallback: if select mode and slot exists -> toggle status
                          if (designMode === 'select' && slot) toggleSlotStatus(slotId);
                          // if move mode and slot exists and no source, start move
                          if (designMode === 'move' && slot && !moveSource) setMoveSource(slotId);
                        },
                        onContextMenu: (e) => {
                          if (designMode === 'select' && slot) {
                            e.preventDefault();
                            toggleSlotVehicleType(slotId);
                          }
                        },
                        title: slot ? `Slot ${slot.slotNumber} - ${slot.vehicleType} - ₹${pricePerHour}/hr` : ''
                      };

                  if (cell === 0) {
                    // Road/driving space or empty
                    return (
                      <div key={slotId} {...cellProps} className={`road-space ${designMode === 'add' ? 'design-cursor-add' : ''}`}>
                        <span className="road-marker">🛣️</span>
                      </div>
                    );
                  } else if (slot) {
                    // Parking slot - Use property's price
                    return (
                      <div key={slotId} {...cellProps} className={`${getSlotClass(slot)} ${isMoveSource ? 'move-source' : ''}`}>
                        <div className="slot-number">{slot.slotNumber}</div>
                        <div className="slot-icon">
                          {slot.vehicleType === vehicleTypes.CAR ? '🚗' : '🏍️'}
                        </div>
                        <div className="slot-price">₹{pricePerHour}/hr</div>
                      </div>
                    );
                  }

                  // empty space (clickable for adding in add mode)
                  return <div key={slotId} {...cellProps} className={`empty-space ${designMode === 'add' ? 'clickable-add' : ''}`} />;
                })
              )}
            </div>
          </div>

          <div className="slot-summary">
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-number">{Object.keys(slotConfiguration).length}</span>
                <span className="stat-label">Total Slots</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{Object.values(slotConfiguration).filter(s => s.status === slotStatus.AVAILABLE).length}</span>
                <span className="stat-label">Available</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{Object.values(slotConfiguration).filter(s => s.vehicleType === vehicleTypes.CAR).length}</span>
                <span className="stat-label">Car Slots</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{Object.values(slotConfiguration).filter(s => s.vehicleType === vehicleTypes.BIKE).length}</span>
                <span className="stat-label">Bike Slots</span>
              </div>
            </div>
          </div>
        </div>

        <div className="designer-actions">
          <button className="btn-secondary" onClick={() => setStep(1)}>
            ← Back to Templates
          </button>
          <button className="btn-primary" onClick={() => setStep(3)}>
            Preview Layout →
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    // Preview Step
    const template = availableTemplates.find(t => t.id === selectedTemplate) || null;
    
    return (
      <div className="parking-layout-designer">
        <div className="designer-header">
          <h2>👀 Preview Your Parking Layout</h2>
          <p>This is how customers will see your parking layout</p>
        </div>

        <div className="preview-panel">
          <div className="preview-info">
            <h3>{template ? template.name : (selectedTemplate === 'dxf-import' ? 'DXF Imported Layout' : (selectedTemplate === 'manual-blank' ? 'Manual Layout' : 'Custom Layout'))}</h3>
            <p>{template ? template.description : ''}</p>
          </div>

          <div className="layout-preview customer-view">
            <div className="parking-grid" style={{
              gridTemplateRows: `repeat(${layoutData.length}, 1fr)`,
              gridTemplateColumns: `repeat(${layoutData[0]?.length || 1}, 1fr)`
            }}>
              {layoutData.map((row, rowIndex) => 
                row.map((cell, colIndex) => {
                  const slotId = `${rowIndex}-${colIndex}`;
                  const slot = slotConfiguration[slotId];
                  
                  if (cell === 0) {
                    return (
                      <div key={slotId} className="road-space">
                        <span className="road-marker">🛣️</span>
                      </div>
                    );
                  } else if (slot) {
                    // Preview - Use property's price
                    return (
                      <div
                        key={slotId}
                        className={`${getSlotClass(slot)} customer-slot`}
                        title={`Slot ${slot.slotNumber} - ${slot.vehicleType} - ₹${pricePerHour}/hr`}
                      >
                        <div className="slot-number">{slot.slotNumber}</div>
                        <div className="slot-icon">
                          {slot.vehicleType === vehicleTypes.CAR ? '🚗' : '🏍️'}
                        </div>
                        {slot.status === slotStatus.AVAILABLE && (
                          <div className="slot-price">₹{pricePerHour}</div>
                        )}
                      </div>
                    );
                  }
                  
                  return <div key={slotId} className="empty-space"></div>;
                })
              )}
            </div>
          </div>

          <div className="entry-exit-info">
            <div className="direction-info">
              <span className="entry-marker">🚪 Entry: {entryExit.entry}</span>
              <span className="exit-marker">🚪 Exit: {entryExit.exit}</span>
            </div>
          </div>
        </div>

        <div className="designer-actions">
          <button className="btn-secondary" onClick={() => setStep(2)}>
            ← Back to Configure
          </button>
          <button className="btn-success" onClick={handleSaveLayout}>
            💾 {isNewProperty ? 'Select This Layout' : 'Save Layout'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ParkingLayoutDesigner;