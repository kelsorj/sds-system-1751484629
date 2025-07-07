import React, { useState, useEffect, useRef } from 'react';
import SmilesDrawerLib from 'smiles-drawer';

/**
 * SmilesDrawer component - An alternative to RDKit for rendering SMILES structures
 * Uses the smiles-drawer library which is pure JavaScript (no WebAssembly required)
 */
const SmilesDrawer = ({ smiles, width = 120, height = 80, id }) => {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!smiles || typeof smiles !== 'string' || smiles.trim() === '') {
      setError('No SMILES data');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a new SmilesDrawer instance
      const smilesDrawer = new SmilesDrawerLib.Drawer({
        width,
        height,
        bondThickness: 1.2,
        shortBondLength: 0.8,
        bondSpacing: 5.1,
        atomVisualization: 'default',
        isomeric: true,
        debug: false
      });

      // Wait for the next frame to ensure the canvas is ready
      setTimeout(() => {
        try {
          if (canvasRef.current) {
            // Parse the SMILES string and draw it on the canvas
            SmilesDrawerLib.parse(smiles.trim(), function(tree) {
              try {
                smilesDrawer.draw(tree, canvasRef.current, 'light', false);
                setLoading(false);
              } catch (e) {
                console.error(`[${id}] Error drawing molecule:`, e);
                setError(`Draw error: ${e.message}`);
                setLoading(false);
              }
            }, function(err) {
              console.error(`[${id}] Error parsing SMILES:`, err);
              setError(`Parse error: ${err}`);
              setLoading(false);
            });
          } else {
            setError('Canvas not ready');
            setLoading(false);
          }
        } catch (e) {
          console.error(`[${id}] Error in drawer:`, e);
          setError(`Error: ${e.message}`);
          setLoading(false);
        }
      }, 10);
    } catch (e) {
      console.error(`[${id}] Error initializing smiles-drawer:`, e);
      setError(`Init error: ${e.message}`);
      setLoading(false);
    }
  }, [smiles, width, height, id]);

  if (loading) {
    return (
      <div style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px'
      }}>
        <span style={{ fontSize: '12px', color: '#6c757d' }}>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }}
        title={error}
      >
        <span style={{ fontSize: '12px', color: '#6c757d', textAlign: 'center' }}>
          {smiles ? 'Structure Error' : 'N/A'}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: '#ffffff',
        border: '1px solid #dee2e6',
        borderRadius: '4px'
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default SmilesDrawer;
