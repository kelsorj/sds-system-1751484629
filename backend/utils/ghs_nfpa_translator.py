"""
GHS to NFPA translation utility
"""
import json
from pathlib import Path
from typing import Dict, Any, Optional

class GHSToNFPATranslator:
    def __init__(self, rules_path: Optional[str] = None):
        """
        Initialize the translator with GHS to NFPA rules.
        If no rules_path is provided, uses the default rules.
        """
        if rules_path is None:
            rules_path = Path(__file__).parent.parent / 'data' / 'ghs_to_nfpa_rules.json'
        
        self.rules = self._load_rules(rules_path)
    
    def _load_rules(self, rules_path: str) -> Dict[str, Any]:
        """Load GHS to NFPA rules from JSON file"""
        try:
            with open(rules_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            raise ValueError(f"Failed to load GHS to NFPA rules: {str(e)}")
    
    def translate_ghs_to_nfpa(
        self,
        ghs_category: str,
        flash_point_f: Optional[float] = None,
        boiling_point_f: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Translate GHS category to NFPA classification
        
        Args:
            ghs_category: GHS category (e.g., 'Category 1', 'Category 2')
            flash_point_f: Flash point in Fahrenheit (optional)
            boiling_point_f: Boiling point in Fahrenheit (optional)
            
        Returns:
            Dictionary containing NFPA classification and related info
        """
        if ghs_category not in self.rules.get('ghs_to_nfpa', {}):
            return {
                'nfpa_class': 'Not classified',
                'nfpa_flammability': 0,
                'fire_code_type': 'Not classified',
                'flash_point_description': 'Not available',
                'boiling_point_description': 'Not available'
            }
        
        rules = self.rules['ghs_to_nfpa'][ghs_category]
        
        for rule in rules:
            if self._matches_rule(rule['rule'], flash_point_f, boiling_point_f):
                return rule['output']
        
        # If no rule matches, return default
        return {
            'nfpa_class': 'Not classified',
            'nfpa_flammability': 0,
            'fire_code_type': 'Not classified',
            'flash_point_description': 'Not available',
            'boiling_point_description': 'Not available'
        }
    
    def _matches_rule(
        self,
        rule: Dict[str, Any],
        flash_point: Optional[float],
        boiling_point: Optional[float]
    ) -> bool:
        """Check if the given values match the rule constraints"""
        # Check flash point constraints if provided
        if 'flash_point_f' in rule and flash_point is not None:
            fp_rule = rule['flash_point_f']
            if 'min' in fp_rule:
                if fp_rule.get('min_inclusive', True):
                    if flash_point < fp_rule['min']:
                        return False
                elif flash_point <= fp_rule['min']:
                    return False
            
            if 'max' in fp_rule:
                if fp_rule.get('max_inclusive', True):
                    if flash_point > fp_rule['max']:
                        return False
                elif flash_point >= fp_rule['max']:
                    return False
        
        # Check boiling point constraints if provided
        if 'boiling_point_f' in rule and boiling_point is not None:
            bp_rule = rule['boiling_point_f']
            if 'min' in bp_rule:
                if bp_rule.get('min_inclusive', True):
                    if boiling_point < bp_rule['min']:
                        return False
                elif boiling_point <= bp_rule['min']:
                    return False
            
            if 'max' in bp_rule:
                if bp_rule.get('max_inclusive', True):
                    if boiling_point > bp_rule['max']:
                        return False
                elif boiling_point >= bp_rule['max']:
                    return False
        
        return True

# Create a singleton instance
translator = GHSToNFPATranslator()
