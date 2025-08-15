import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://ekmbalps1.corp.eikontx.com:6443/api';

// Cache for the translation rules
let translationRules = null;

export const translationService = {
  // Load translation rules from the backend
  async loadTranslationRules() {
    if (translationRules) {
      return translationRules; // Return cached rules
    }
    
    try {
      const response = await axios.get(`${API_URL}/ghs-nfpa-rules`);
      translationRules = response.data;
      return translationRules;
    } catch (error) {
      console.error('Error loading GHS-NFPA translation rules:', error);
      throw error;
    }
  },

  // Check if a value satisfies a constraint
  checkConstraint(value, constraint) {
    if (constraint === undefined) return true;
    
    if (constraint.min !== undefined) {
      if (constraint.min_inclusive && value < constraint.min) return false;
      if (!constraint.min_inclusive && value <= constraint.min) return false;
    }
    
    if (constraint.max !== undefined) {
      if (constraint.max_inclusive && value > constraint.max) return false;
      if (!constraint.max_inclusive && value >= constraint.max) return false;
    }
    
    return true;
  },

  // Check if all rules in a rule set are satisfied
  checkRuleSet(ruleSet, flashPointF, boilingPointF) {
    for (const rule of ruleSet) {
      const ruleConstraints = rule.rule;
      let allConstraintsSatisfied = true;
      
      // Check flash point constraint
      if (flashPointF !== null && ruleConstraints.flash_point_f) {
        if (!this.checkConstraint(flashPointF, ruleConstraints.flash_point_f)) {
          allConstraintsSatisfied = false;
        }
      }
      
      // Check boiling point constraint
      if (boilingPointF !== null && ruleConstraints.boiling_point_f) {
        if (!this.checkConstraint(boilingPointF, ruleConstraints.boiling_point_f)) {
          allConstraintsSatisfied = false;
        }
      }
      
      if (allConstraintsSatisfied) {
        return rule.output;
      }
    }
    
    return null; // No matching rule found
  },

  // Main translation function
  translateGhsToNfpa(ghsCategory, flashPointF = null, boilingPointF = null) {
    if (!translationRules) {
      console.warn('Translation rules not loaded yet');
      return null;
    }

    const categoryRules = translationRules.ghs_to_nfpa[ghsCategory];
    if (!categoryRules) {
      console.warn(`No rules found for GHS category: ${ghsCategory}`);
      return null;
    }

    const result = this.checkRuleSet(categoryRules, flashPointF, boilingPointF);
    
    if (result) {
      return {
        nfpaClass: result.nfpa_class,
        nfpaFlammability: result.nfpa_flammability,
        fireCodeType: result.fire_code_type,
        flashPointDescription: result.flash_point_description,
        boilingPointDescription: result.boiling_point_description
      };
    }
    
    return null;
  },

  // Get all available GHS categories
  getAvailableGhsCategories() {
    if (!translationRules) return [];
    return Object.keys(translationRules.ghs_to_nfpa);
  },

  // Get NFPA flammability color based on rating
  getNfpaFlammabilityColor(rating) {
    switch (rating) {
      case 0: return '#FFFFFF'; // White
      case 1: return '#FF0000'; // Red
      case 2: return '#FF6600'; // Orange
      case 3: return '#FFFF00'; // Yellow
      case 4: return '#FF0000'; // Red (same as 1, but more intense)
      default: return '#CCCCCC'; // Gray
    }
  },

  // Get NFPA flammability description
  getNfpaFlammabilityDescription(rating) {
    switch (rating) {
      case 0: return 'Will not burn';
      case 1: return 'Must be preheated before ignition can occur';
      case 2: return 'Must be moderately heated or exposed to relatively high ambient temperature before ignition can occur';
      case 3: return 'Can be ignited under almost all ambient temperature conditions';
      case 4: return 'Will rapidly or completely vaporize at atmospheric pressure and normal ambient temperature, or is readily dispersed in air and will burn readily';
      default: return 'Unknown';
    }
  }
};
