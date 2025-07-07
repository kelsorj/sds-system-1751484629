import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Popper, Paper } from '@mui/material';

// Molecule renderer using RDKit
function MoleculeViewer({ smiles, width = 80, height = 50, compact = false }) {
  const canvasRef = useRef(null);
  const popupCanvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupReady, setPopupReady] = useState(false);
  const popupTimeoutRef = useRef(null);

  // Helper function to draw molecule on canvas
  const drawMolecule = async (canvas, isPopup = false) => {
    if (!canvas || !smiles) return;
    
    console.log(`Drawing molecule${isPopup ? ' (popup)' : ''}, SMILES: ${smiles}`);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      // Fetch the molecule image from RDKit server with appropriate size
      const response = await fetch(
        `http://ekmbalps1.corp.eikontx.com:6900/api/draw_molecule?smiles=${encodeURIComponent(smiles)}&width=${isPopup ? 300 : width}&height=${isPopup ? 200 : height}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'image/png',
          },
          mode: 'cors'
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to draw molecule: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const img = new Image();
      
      img.onload = () => {
        console.log(`Image loaded${isPopup ? ' (popup)' : ''}, size: ${img.width}x${img.height}`);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (isPopup) {
          // For popup, draw at full size
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } else {
          // For thumbnail, maintain aspect ratio
          ctx.drawImage(img, 0, 0, width, height);
        }
        if (!isPopup) {
          setLoading(false);
        }
      };
      
      img.src = URL.createObjectURL(blob);
    } catch (err) {
      console.error('Error drawing molecule:', err);
      if (!isPopup) {
        setError(err.message);
        setLoading(false);
      }
      // Draw placeholder for error state
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Error drawing structure', canvas.width / 2, canvas.height / 2);
    }
  };

  // Draw main molecule view
  useEffect(() => {
    if (!canvasRef.current || !smiles) {
      setLoading(false);
      return;
    }

    drawMolecule(canvasRef.current, false);
  }, [smiles, width, height]);

  // Hover handlers
  const handleMouseEnter = (event) => {
    console.log('Mouse enter, showing popup');
    setAnchorEl(event.currentTarget);
    setShowPopup(true);
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    console.log('Mouse leave, hiding popup');
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }
    popupTimeoutRef.current = setTimeout(() => {
      setShowPopup(false);
      setPopupReady(false);
    }, 100);
  };

  // Handle popup canvas mounting
  const handlePopupCanvasRef = (canvas) => {
    console.log('Popup canvas ref updated:', !!canvas);
    popupCanvasRef.current = canvas;
    if (canvas) {
      setPopupReady(true);
    }
  };

  // Draw popup view when canvas is ready
  useEffect(() => {
    console.log('Popup effect triggered:', { showPopup, popupReady, hasCanvas: !!popupCanvasRef.current, smiles });
    if (!showPopup || !popupReady || !popupCanvasRef.current || !smiles) return;
    drawMolecule(popupCanvasRef.current, true);
  }, [showPopup, popupReady, smiles]);

  return (
    <Box sx={{ textAlign: 'center', mb: compact ? 0 : 1 }}>
      {!compact && (
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Structure:</strong>
        </Typography>
      )}
      
      <Box 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{ 
          display: 'inline-block',
          position: 'relative',
          width: width,
          height: height,
          cursor: 'pointer'
        }}
      >
        {loading && (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)'
          }}>
            <CircularProgress size={20} />
          </Box>
        )}
        
        {error && (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)'
          }}>
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          </Box>
        )}
        
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height} 
          style={{ display: 'block' }}
        />
      </Box>

      {showPopup && (
        <Popper 
          open={true}
          anchorEl={anchorEl}
          placement="right-start"
          sx={{ zIndex: 1500 }}
          modifiers={[{
            name: 'offset',
            options: { offset: [10, 0] }
          }]}
        >
          <Paper 
            elevation={8}
            sx={{ 
              p: 2,
              bgcolor: '#fff',
              border: '1px solid #ccc',
              borderRadius: 1
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <canvas 
              ref={handlePopupCanvasRef}
              width={300} 
              height={200} 
              style={{ display: 'block' }}
            />
          </Paper>
        </Popper>
      )}
    </Box>
  );
}

export default MoleculeViewer;
