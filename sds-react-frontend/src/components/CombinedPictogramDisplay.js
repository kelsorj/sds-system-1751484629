import React from 'react';
import { Box, Chip, Typography, Tooltip, Badge } from '@mui/material';
import { getPictogramImageUrl, getCombinedPictograms, getPictogramWithSource } from '../utils/ghsPictogramMapping';
import { getHazardStatementDescription } from '../utils/hazardPictogramMapping';

// Component to display a single pictogram with source indication
const CombinedPictogramChip = ({ 
  pictogramId, 
  ghsPictograms = [], 
  hazardStatements = [], 
  onDelete, 
  size = 'medium',
  showSource = true 
}) => {
  const imageUrl = getPictogramImageUrl(pictogramId);
  const pictogramInfo = getPictogramWithSource(pictogramId, ghsPictograms, hazardStatements);
  
  if (!imageUrl || !pictogramInfo) {
    return null;
  }

  const chipSize = size === 'small' ? 24 : size === 'large' ? 48 : 32;
  
  // Create tooltip content showing source information
  const tooltipContent = (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
        {pictogramInfo.name} ({pictogramId})
      </Typography>
      {showSource && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          Source: {
            pictogramInfo.source === 'both' ? 'GHS Code + Hazard Statement' :
            pictogramInfo.source === 'explicit' ? 'GHS Code' :
            'Hazard Statement'
          }
        </Typography>
      )}
      {pictogramInfo.hazardDerived && hazardStatements.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            Related Hazard Statements:
          </Typography>
          {hazardStatements
            .filter(hs => {
              // Import the mapping function to check which statements contribute to this pictogram
              const { getHazardStatementPictograms } = require('../utils/hazardPictogramMapping');
              return getHazardStatementPictograms(hs).includes(pictogramId);
            })
            .map(hs => (
              <Typography key={hs} variant="caption" sx={{ display: 'block' }}>
                {hs}: {getHazardStatementDescription(hs)}
              </Typography>
            ))
          }
        </Box>
      )}
    </Box>
  );

  const chip = (
    <Chip
      avatar={
        <img 
          src={imageUrl} 
          alt={pictogramId}
          style={{ 
            width: chipSize, 
            height: chipSize, 
            objectFit: 'contain',
            backgroundColor: 'transparent'
          }}
        />
      }
      label={pictogramId}
      onDelete={onDelete}
      variant="outlined"
      size={size}
      sx={{
        '& .MuiChip-avatar': {
          width: chipSize + 4,
          height: chipSize + 4,
          marginLeft: '4px'
        },
        '& .MuiChip-label': {
          paddingLeft: '8px',
          fontSize: size === 'small' ? '0.75rem' : '0.875rem'
        }
      }}
    />
  );

  // Add a badge indicator for source type
  const badgedChip = showSource && pictogramInfo.source !== 'explicit' ? (
    <Badge
      badgeContent={pictogramInfo.source === 'both' ? 'H+G' : 'H'}
      color={pictogramInfo.source === 'both' ? 'primary' : 'secondary'}
      sx={{
        '& .MuiBadge-badge': {
          fontSize: '0.6rem',
          height: 16,
          minWidth: 16
        }
      }}
    >
      {chip}
    </Badge>
  ) : chip;

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      {badgedChip}
    </Tooltip>
  );
};

// Component to display combined pictograms from both GHS codes and hazard statements
const CombinedPictogramDisplay = ({ 
  ghsPictograms = [], 
  hazardStatements = [],
  onPictogramDelete, 
  size = 'medium',
  showLabels = true,
  showSource = true,
  maxWidth = '100%'
}) => {
  const combinedPictograms = getCombinedPictograms(ghsPictograms, hazardStatements);
  
  if (!combinedPictograms || combinedPictograms.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No pictograms specified
      </Typography>
    );
  }

  return (
    <Box>
      {showLabels && (
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Hazard Pictograms ({combinedPictograms.length})
        </Typography>
      )}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1, 
        maxWidth,
        alignItems: 'center'
      }}>
        {combinedPictograms.map((pictogram, index) => (
          <CombinedPictogramChip
            key={`${pictogram}-${index}`}
            pictogramId={pictogram}
            ghsPictograms={ghsPictograms}
            hazardStatements={hazardStatements}
            onDelete={onPictogramDelete ? () => onPictogramDelete(index) : undefined}
            size={size}
            showSource={showSource}
          />
        ))}
      </Box>
      
      {/* Summary information */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {ghsPictograms.length > 0 && `${ghsPictograms.length} from GHS codes`}
          {ghsPictograms.length > 0 && hazardStatements.length > 0 && ' • '}
          {hazardStatements.length > 0 && `${hazardStatements.length} hazard statements analyzed`}
        </Typography>
      </Box>
    </Box>
  );
};

// Component to display just the images without chips (for compact display)
const CombinedPictogramImages = ({ 
  ghsPictograms = [],
  hazardStatements = [],
  size = 32,
  showTooltips = true,
  maxImages = null,
  showSource = false
}) => {
  const combinedPictograms = getCombinedPictograms(ghsPictograms, hazardStatements);
  
  if (!combinedPictograms || combinedPictograms.length === 0) {
    return null;
  }

  const displayPictograms = maxImages ? combinedPictograms.slice(0, maxImages) : combinedPictograms;
  const hasMore = maxImages && combinedPictograms.length > maxImages;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {displayPictograms.map((pictogram, index) => {
        const imageUrl = getPictogramImageUrl(pictogram);
        const pictogramInfo = getPictogramWithSource(pictogram, ghsPictograms, hazardStatements);
        
        if (!imageUrl) return null;

        const image = (
          <img
            key={`${pictogram}-${index}`}
            src={imageUrl}
            alt={pictogram}
            style={{
              width: size,
              height: size,
              objectFit: 'contain'
            }}
          />
        );

        if (!showTooltips) return image;

        const tooltipContent = showSource ? (
          <Box>
            <Typography variant="body2">{pictogramInfo?.name || pictogram}</Typography>
            <Typography variant="caption">
              Source: {
                pictogramInfo?.source === 'both' ? 'GHS + Hazard' :
                pictogramInfo?.source === 'explicit' ? 'GHS Code' :
                'Hazard Statement'
              }
            </Typography>
          </Box>
        ) : (pictogramInfo?.name || pictogram);

        return (
          <Tooltip key={`${pictogram}-${index}`} title={tooltipContent} arrow>
            {showSource && pictogramInfo?.source !== 'explicit' ? (
              <Badge
                badgeContent={pictogramInfo.source === 'both' ? 'H+G' : 'H'}
                color={pictogramInfo.source === 'both' ? 'primary' : 'secondary'}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.5rem',
                    height: 12,
                    minWidth: 12
                  }
                }}
              >
                {image}
              </Badge>
            ) : image}
          </Tooltip>
        );
      })}
      {hasMore && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          +{combinedPictograms.length - maxImages} more
        </Typography>
      )}
    </Box>
  );
};

export { CombinedPictogramDisplay, CombinedPictogramImages, CombinedPictogramChip };
