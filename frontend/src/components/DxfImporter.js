import React from 'react';

// Lightweight DXF polyline extractor (works on common ASCII DXF files)
// This avoids adding `dxf-parser` which can cause bundling issues in some CRA setups.
// The component accepts a file, extracts simple POLYLINE / LWPOLYLINE vertex coordinates,
// and calls `onParse(layout)` with a normalized layout object: { polylines: [ [ {x,y}, ... ] ] }

export default function DxfImporter({ onParse }) {
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const polylines = [];

      // Basic parser: find LWPOLYLINE blocks and collect vertex coordinates (10/20 groups)
      const lines = text.split(/\r?\n/);
      let i = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        if (line === 'LWPOLYLINE' || line === 'POLYLINE') {
          // Advance until we hit 10 group codes (x) and 20 group codes (y)
          const verts = [];
          i++;
          while (i < lines.length && lines[i].trim() !== 'SEQEND' && lines[i].trim() !== '0') {
            const code = lines[i].trim();
            const value = (lines[i+1] || '').trim();
            // LWPOLYLINE uses group codes 10,20 for vertices in ASCII DXF
            if (code === '10') {
              const x = parseFloat(value);
              // next 20 should be on following groups
              let y = null;
              // scan ahead for 20
              let j = i+2;
              while (j < lines.length) {
                if (lines[j].trim() === '20') { y = parseFloat((lines[j+1] || '').trim()); break; }
                j += 2;
              }
              if (!Number.isNaN(x) && y !== null && !Number.isNaN(y)) {
                verts.push({ x, y });
              }
            }
            i += 2; // move by group code/value pair
          }

          if (verts.length) polylines.push(verts);
        } else {
          i++;
        }
      }

      // Normalized layout: transform polylines into a compact representation
      const layout = { polylines };
      onParse && onParse(layout);
    } catch (err) {
      console.error('DXF parse error', err);
      alert('Failed to parse DXF file. Please use a simple DXF with polylines.');
    }
  };

  return (
    <div className="dxf-importer">
      <label className="dxf-upload-label">
        Upload DXF to import layout
        <input type="file" accept=".dxf" onChange={handleFile} style={{ display: 'none' }} />
      </label>
    </div>
  );
}
