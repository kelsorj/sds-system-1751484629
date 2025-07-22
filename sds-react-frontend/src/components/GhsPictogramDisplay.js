import React from 'react';
import { Box, Chip, Typography, Tooltip } from '@mui/material';
import { getPictogramImageUrl, getAvailablePictograms, getCombinedPictograms, getPictogramWithSource } from '../utils/ghsPictogramMapping';
import { getHazardStatementDescription } from '../utils/hazardPictogramMapping';

// Component to display a single GHS pictogram with image
const GhsPictogramChip = ({ pictogramId, onDelete, size = 'medium' }) => {
  const imageUrl = getPictogramImageUrl(pictogramId);
  const availablePictograms = getAvailablePictograms();
  const pictogramInfo = availablePictograms.find(p => 
    p.code.toLowerCase() === pictogramId.toLowerCase() || 
    p.name.toLowerCase() === pictogramId.toLowerCase()
  );

  const chipSize = size === 'small' ? 24 : size === 'large' ? 48 : 32;

  // Debug logging
  console.log('GHS Pictogram Debug:');
  console.log('- pictogramId:', pictogramId);
  console.log('- imageUrl:', imageUrl);
  console.log('- pictogramInfo:', pictogramInfo);
  console.log('- chipSize:', chipSize);
  
  return (
    <Tooltip title={pictogramInfo?.name || pictogramId} arrow>
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {imageUrl && (
              <img
                src={imageUrl}
                alt={pictogramId}
                style={{
                  width: chipSize,
                  height: chipSize,
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  // Hide image if it fails to load and log the error
                  console.error('GHS Image failed to load:', {
                    pictogramId,
                    imageUrl,
                    error: e.target.src
                  });
                  e.target.style.display = 'none';
                }}
              />
            )}
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {pictogramId}
            </Typography>
          </Box>
        }
        variant="outlined"
        onDelete={onDelete}
        sx={{
          height: 'auto',
          minHeight: chipSize + 16,
          '& .MuiChip-label': {
            padding: '8px 12px',
          }
        }}
      />
    </Tooltip>
  );
};

// Component to display multiple GHS pictograms
const GhsPictogramDisplay = ({ 
  pictograms = [], 
  onPictogramDelete, 
  size = 'medium',
  showLabels = true,
  maxWidth = '100%'
}) => {
  if (!pictograms || pictograms.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No pictograms specified
      </Typography>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: 1, 
      maxWidth,
      alignItems: 'center'
    }}>
      {pictograms.map((pictogram, index) => (
        <GhsPictogramChip
          key={`${pictogram}-${index}`}
          pictogramId={pictogram}
          onDelete={onPictogramDelete ? () => onPictogramDelete(index) : undefined}
          size={size}
        />
      ))}
    </Box>
  );
};

// Component to display just the images without chips (for compact display)
const GhsPictogramImages = ({ 
  pictograms = [], 
  size = 32,
  showTooltips = true,
  maxImages = null
}) => {
  if (!pictograms || pictograms.length === 0) {
    return null;
  }

  const displayPictograms = maxImages ? pictograms.slice(0, maxImages) : pictograms;
  const hasMore = maxImages && pictograms.length > maxImages;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {displayPictograms.map((pictogram, index) => {
        const imageUrl = getPictogramImageUrl(pictogram);
        const availablePictograms = getAvailablePictograms();
        const pictogramInfo = availablePictograms.find(p => 
          p.code.toLowerCase() === pictogram.toLowerCase() || 
          p.name.toLowerCase() === pictogram.toLowerCase()
        );

        if (!imageUrl) return null;

        const imageElement = (
          <img
            key={`${pictogram}-${index}`}
            src={imageUrl}
            alt={pictogram}
            style={{
              width: size,
              height: size,
              objectFit: 'contain',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: '#fff'
            }}
            onError={(e) => {
              console.error('GHS Image failed to load (Images component):', {
                pictogram,
                imageUrl,
                error: e.target.src
              });
              e.target.style.display = 'none';
            }}
          />
        );

        return showTooltips ? (
          <Tooltip key={`${pictogram}-${index}`} title={pictogramInfo?.name || pictogram} arrow>
            {imageElement}
          </Tooltip>
        ) : imageElement;
      })}
      {hasMore && (
        <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
          +{pictograms.length - maxImages} more
        </Typography>
      )}
    </Box>
  );
};

export { GhsPictogramChip, GhsPictogramDisplay, GhsPictogramImages };
export default GhsPictogramDisplay;
