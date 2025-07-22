// GHS Pictogram mapping utility
// Maps GHS pictogram codes to their corresponding image files

export const GHS_PICTOGRAM_MAPPING = {
  // Standard GHS pictogram codes to image file mapping
  'GHS01': 'explodingbomb.png',     // Explosive
  'GHS02': 'flame.png',             // Flammable
  'GHS03': 'flameovercircle.png',   // Oxidizing
  'GHS04': 'cylinder.png',          // Compressed Gas
  'GHS05': 'corrosion.png',         // Corrosive
  'GHS06': 'skull.png',             // Toxic
  'GHS07': 'mark.png',              // Harmful/Irritant
  'GHS08': 'health.png',            // Health Hazard
  'GHS09': 'environment.png',       // Environmental Hazard
  
  // Alternative naming conventions that might be used
  'explosive': 'explodingbomb.png',
  'exploding_bomb': 'explodingbomb.png',
  'flammable': 'flame.png',
  'flame': 'flame.png',
  'oxidizing': 'flameovercircle.png',
  'flame_over_circle': 'flameovercircle.png',
  'compressed_gas': 'cylinder.png',
  'gas_cylinder': 'cylinder.png',
  'cylinder': 'cylinder.png',
  'corrosive': 'corrosion.png',
  'corrosion': 'corrosion.png',
  'toxic': 'skull.png',
  'skull': 'skull.png',
  'skull_crossbones': 'skull.png',
  'harmful': 'mark.png',
  'irritant': 'mark.png',
  'exclamation': 'mark.png',
  'health_hazard': 'health.png',
  'health': 'health.png',
  'environmental': 'environment.png',
  'environment': 'environment.png',
  'aquatic_toxicity': 'environment.png'
};

// Get the image filename for a given pictogram identifier
export const getPictogramImage = (pictogramId) => {
  if (!pictogramId) return null;
  
  // Handle various formats - try original case first, then lowercase
  const trimmedId = pictogramId.trim();
  const normalizedId = trimmedId.toLowerCase();
  
  return GHS_PICTOGRAM_MAPPING[trimmedId] || GHS_PICTOGRAM_MAPPING[normalizedId] || null;
};

// Get the full image URL for a pictogram
export const getPictogramImageUrl = (pictogramId, baseUrl = 'http://ekmbalps1.corp.eikontx.com:6443/api/sds/ghspics') => {
  const imageFile = getPictogramImage(pictogramId);
  if (!imageFile) return null;
  
  return `${baseUrl}/${imageFile}`;
};

// Get all available pictogram options with their image files
export const getAvailablePictograms = () => {
  return [
    { code: 'GHS01', name: 'Explosive', image: 'explodingbomb.png' },
    { code: 'GHS02', name: 'Flammable', image: 'flame.png' },
    { code: 'GHS03', name: 'Oxidizing', image: 'flameovercircle.png' },
    { code: 'GHS04', name: 'Compressed Gas', image: 'cylinder.png' },
    { code: 'GHS05', name: 'Corrosive', image: 'corrosion.png' },
    { code: 'GHS06', name: 'Toxic', image: 'skull.png' },
    { code: 'GHS07', name: 'Harmful/Irritant', image: 'mark.png' },
    { code: 'GHS08', name: 'Health Hazard', image: 'health.png' },
    { code: 'GHS09', name: 'Environmental Hazard', image: 'environment.png' }
  ];
};
