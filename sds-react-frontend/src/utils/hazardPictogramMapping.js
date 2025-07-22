// Hazard Statement (HXXX) Pictogram mapping utility
// Maps hazard statement codes to their corresponding GHS pictogram codes

export const HAZARD_STATEMENT_PICTOGRAM_MAPPING = {
  // Physical Hazards (H200-H299)
  'H200': ['GHS01'], // Unstable explosive
  'H201': ['GHS01'], // Explosive; mass explosion hazard
  'H202': ['GHS01'], // Explosive; severe projection hazard
  'H203': ['GHS01'], // Explosive; fire, blast or projection hazard
  'H204': ['GHS01'], // Fire or projection hazard
  'H205': ['GHS01'], // May mass explode in fire
  'H220': ['GHS02'], // Extremely flammable gas
  'H221': ['GHS02'], // Flammable gas
  'H222': ['GHS02'], // Extremely flammable aerosol
  'H223': ['GHS02'], // Flammable aerosol
  'H224': ['GHS02'], // Extremely flammable liquid and vapour
  'H225': ['GHS02'], // Highly flammable liquid and vapour
  'H226': ['GHS02'], // Flammable liquid and vapour
  'H228': ['GHS02'], // Flammable solid
  'H240': ['GHS02'], // Heating may cause an explosion
  'H241': ['GHS02'], // Heating may cause a fire or explosion
  'H242': ['GHS02'], // Heating may cause a fire
  'H250': ['GHS02'], // Catches fire spontaneously if exposed to air
  'H251': ['GHS02'], // Self-heating; may catch fire
  'H252': ['GHS02'], // Self-heating in large quantities; may catch fire
  'H260': ['GHS02'], // In contact with water releases flammable gases which may ignite spontaneously
  'H261': ['GHS02'], // In contact with water releases flammable gases
  'H270': ['GHS03'], // May cause or intensify fire; oxidiser
  'H271': ['GHS03'], // May cause fire or explosion; strong oxidiser
  'H272': ['GHS03'], // May intensify fire; oxidiser
  'H280': ['GHS04'], // Contains gas under pressure; may explode if heated
  'H281': ['GHS04'], // Contains refrigerated gas; may cause cryogenic burns or injury
  'H290': ['GHS05'], // May be corrosive to metals

  // Health Hazards (H300-H399)
  'H300': ['GHS06'], // Fatal if swallowed
  'H301': ['GHS06'], // Toxic if swallowed
  'H302': ['GHS07'], // Harmful if swallowed
  'H303': ['GHS07'], // May be harmful if swallowed
  'H304': ['GHS08'], // May be fatal if swallowed and enters airways
  'H310': ['GHS06'], // Fatal in contact with skin
  'H311': ['GHS06'], // Toxic in contact with skin
  'H312': ['GHS07'], // Harmful in contact with skin
  'H313': ['GHS07'], // May be harmful in contact with skin
  'H314': ['GHS05'], // Causes severe skin burns and eye damage
  'H315': ['GHS07'], // Causes skin irritation
  'H316': ['GHS07'], // Causes mild skin irritation
  'H317': ['GHS07'], // May cause an allergic skin reaction
  'H318': ['GHS05'], // Causes serious eye damage
  'H319': ['GHS07'], // Causes serious eye irritation
  'H320': ['GHS07'], // Causes eye irritation
  'H330': ['GHS06'], // Fatal if inhaled
  'H331': ['GHS06'], // Toxic if inhaled
  'H332': ['GHS07'], // Harmful if inhaled
  'H333': ['GHS07'], // May be harmful if inhaled
  'H334': ['GHS07'], // May cause allergy or asthma symptoms or breathing difficulties if inhaled
  'H335': ['GHS07'], // May cause respiratory irritation
  'H336': ['GHS07'], // May cause drowsiness or dizziness
  'H340': ['GHS08'], // May cause genetic defects
  'H341': ['GHS08'], // Suspected of causing genetic defects
  'H350': ['GHS08'], // May cause cancer
  'H351': ['GHS08'], // Suspected of causing cancer
  'H360': ['GHS08'], // May damage fertility or the unborn child
  'H361': ['GHS08'], // Suspected of damaging fertility or the unborn child
  'H362': ['GHS08'], // May cause harm to breast-fed children
  'H370': ['GHS08'], // Causes damage to organs
  'H371': ['GHS08'], // May cause damage to organs
  'H372': ['GHS08'], // Causes damage to organs through prolonged or repeated exposure
  'H373': ['GHS08'], // May cause damage to organs through prolonged or repeated exposure

  // Environmental Hazards (H400-H499)
  'H400': ['GHS09'], // Very toxic to aquatic life
  'H401': ['GHS09'], // Toxic to aquatic life
  'H402': ['GHS09'], // Harmful to aquatic life
  'H410': ['GHS09'], // Very toxic to aquatic life with long lasting effects
  'H411': ['GHS09'], // Toxic to aquatic life with long lasting effects
  'H412': ['GHS09'], // Harmful to aquatic life with long lasting effects
  'H413': ['GHS09'], // May cause long lasting harmful effects to aquatic life
  'H420': ['GHS09'], // Harms public health and the environment by destroying ozone in the upper atmosphere
};

// Get pictogram codes for a given hazard statement
export const getHazardStatementPictograms = (hazardStatement) => {
  if (!hazardStatement) return [];
  
  // Extract hazard code from full statement (e.g., "H302 Harmful if swallowed." -> "H302")
  const hazardCodeMatch = hazardStatement.match(/^(H\d{3})/i);
  if (!hazardCodeMatch) return [];
  
  const hazardCode = hazardCodeMatch[1].toUpperCase();
  
  return HAZARD_STATEMENT_PICTOGRAM_MAPPING[hazardCode] || [];
};

// Get all pictograms for an array of hazard statements
export const getAllHazardStatementPictograms = (hazardStatements) => {
  if (!hazardStatements || !Array.isArray(hazardStatements)) {
    return [];
  }
  
  const allPictograms = hazardStatements.flatMap(statement => 
    getHazardStatementPictograms(statement)
  );
  
  // Return unique pictograms
  return [...new Set(allPictograms)];
};

// Get hazard statement description
export const getHazardStatementDescription = (hazardStatement) => {
  const descriptions = {
    'H200': 'Unstable explosive',
    'H201': 'Explosive; mass explosion hazard',
    'H202': 'Explosive; severe projection hazard',
    'H203': 'Explosive; fire, blast or projection hazard',
    'H204': 'Fire or projection hazard',
    'H205': 'May mass explode in fire',
    'H220': 'Extremely flammable gas',
    'H221': 'Flammable gas',
    'H222': 'Extremely flammable aerosol',
    'H223': 'Flammable aerosol',
    'H224': 'Extremely flammable liquid and vapour',
    'H225': 'Highly flammable liquid and vapour',
    'H226': 'Flammable liquid and vapour',
    'H228': 'Flammable solid',
    'H240': 'Heating may cause an explosion',
    'H241': 'Heating may cause a fire or explosion',
    'H242': 'Heating may cause a fire',
    'H250': 'Catches fire spontaneously if exposed to air',
    'H251': 'Self-heating; may catch fire',
    'H252': 'Self-heating in large quantities; may catch fire',
    'H260': 'In contact with water releases flammable gases which may ignite spontaneously',
    'H261': 'In contact with water releases flammable gases',
    'H270': 'May cause or intensify fire; oxidiser',
    'H271': 'May cause fire or explosion; strong oxidiser',
    'H272': 'May intensify fire; oxidiser',
    'H280': 'Contains gas under pressure; may explode if heated',
    'H281': 'Contains refrigerated gas; may cause cryogenic burns or injury',
    'H290': 'May be corrosive to metals',
    'H300': 'Fatal if swallowed',
    'H301': 'Toxic if swallowed',
    'H302': 'Harmful if swallowed',
    'H303': 'May be harmful if swallowed',
    'H304': 'May be fatal if swallowed and enters airways',
    'H310': 'Fatal in contact with skin',
    'H311': 'Toxic in contact with skin',
    'H312': 'Harmful in contact with skin',
    'H313': 'May be harmful in contact with skin',
    'H314': 'Causes severe skin burns and eye damage',
    'H315': 'Causes skin irritation',
    'H316': 'Causes mild skin irritation',
    'H317': 'May cause an allergic skin reaction',
    'H318': 'Causes serious eye damage',
    'H319': 'Causes serious eye irritation',
    'H320': 'Causes eye irritation',
    'H330': 'Fatal if inhaled',
    'H331': 'Toxic if inhaled',
    'H332': 'Harmful if inhaled',
    'H333': 'May be harmful if inhaled',
    'H334': 'May cause allergy or asthma symptoms or breathing difficulties if inhaled',
    'H335': 'May cause respiratory irritation',
    'H336': 'May cause drowsiness or dizziness',
    'H340': 'May cause genetic defects',
    'H341': 'Suspected of causing genetic defects',
    'H350': 'May cause cancer',
    'H351': 'Suspected of causing cancer',
    'H360': 'May damage fertility or the unborn child',
    'H361': 'Suspected of damaging fertility or the unborn child',
    'H362': 'May cause harm to breast-fed children',
    'H370': 'Causes damage to organs',
    'H371': 'May cause damage to organs',
    'H372': 'Causes damage to organs through prolonged or repeated exposure',
    'H373': 'May cause damage to organs through prolonged or repeated exposure',
    'H400': 'Very toxic to aquatic life',
    'H401': 'Toxic to aquatic life',
    'H402': 'Harmful to aquatic life',
    'H410': 'Very toxic to aquatic life with long lasting effects',
    'H411': 'Toxic to aquatic life with long lasting effects',
    'H412': 'Harmful to aquatic life with long lasting effects',
    'H413': 'May cause long lasting harmful effects to aquatic life',
    'H420': 'Harms public health and the environment by destroying ozone in the upper atmosphere'
  };
  
  const normalizedStatement = hazardStatement ? hazardStatement.trim().toUpperCase() : '';
  return descriptions[normalizedStatement] || hazardStatement;
};

// Get all available hazard statements with their descriptions
export const getAvailableHazardStatements = () => {
  return Object.keys(HAZARD_STATEMENT_PICTOGRAM_MAPPING).map(code => ({
    code,
    description: getHazardStatementDescription(code),
    pictograms: HAZARD_STATEMENT_PICTOGRAM_MAPPING[code]
  }));
};
