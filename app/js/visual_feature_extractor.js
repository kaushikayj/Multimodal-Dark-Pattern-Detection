/**
 * Visual Feature Extractor for Dark Pattern Detection
 * Extracts simple visual features from DOM elements without ML
 * These features help identify deceptive UI patterns
 */

class VisualFeatureExtractor {
  /**
   * Extract visual features from a DOM element
   * @param {string} text - The text content of the element
   * @param {Element} element - The DOM element
   * @returns {Object} Visual features
   */
  static extractFeatures(text, element) {
    if (!element || !text) {
      return this.getDefaultFeatures();
    }

    const features = {
      // Color-based features
      urgency_color_score: this.getUrgencyColorScore(element),
      button_prominence: this.getButtonProminence(element),
      
      // Size-based features
      font_size_ratio: this.getFontSizeRatio(element),
      button_size_score: this.getButtonSize(element),
      
      // Position-based features
      is_above_fold: this.isAboveFold(element),
      is_fixed_position: this.isFixedPosition(element),
      position_prominence: this.getPositionProminence(element),
      
      // Text-based visual cues
      urgency_text_markers: this.countUrgencyMarkers(text),
      scarcity_indicators: this.countScarcityIndicators(text),
      
      // Contrast and visibility
      contrast_ratio: this.getContrastRatio(element),
      
      // Interactive elements
      is_button_like: this.isButtonLike(element),
      is_hidden: this.isHidden(element)
    };

    return features;
  }

  /**
   * Get urgency color score (red/orange = high urgency)
   */
  static getUrgencyColorScore(element) {
    const style = window.getComputedStyle(element);
    const bgColor = style.backgroundColor;
    const textColor = style.color;
    
    const urgencyColors = ['red', 'rgb(255, 0, 0)', 'orange', 'rgb(255, 165, 0)', '#ff0000', '#ff6600'];
    
    let score = 0;
    
    // Check background color
    if (this.colorMatches(bgColor, urgencyColors)) {
      score += 0.5;
    }
    
    // Check text color
    if (this.colorMatches(textColor, urgencyColors)) {
      score += 0.3;
    }
    
    // Check for red hex codes
    if (bgColor.includes('rgb') && this.isRedish(bgColor)) {
      score += 0.4;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Check if color matches urgency colors
   */
  static colorMatches(color, urgencyColors) {
    if (!color) return false;
    const lowerColor = color.toLowerCase();
    return urgencyColors.some(uc => lowerColor.includes(uc.toLowerCase()));
  }

  /**
   * Check if RGB color is reddish
   */
  static isRedish(rgbColor) {
    const match = rgbColor.match(/\d+/g);
    if (!match || match.length < 3) return false;
    
    const r = parseInt(match[0]);
    const g = parseInt(match[1]);
    const b = parseInt(match[2]);
    
    // Red if R > 150 and R > G+50 and R > B+50
    return r > 150 && r > g + 50 && r > b + 50;
  }

  /**
   * Get button prominence score
   */
  static getButtonProminence(element) {
    const tagName = element.tagName.toLowerCase();
    const isButton = tagName === 'button' || 
                     tagName === 'a' ||
                     element.classList.contains('btn') ||
                     element.classList.contains('button');
    
    if (!isButton) return 0;
    
    const style = window.getComputedStyle(element);
    const bgColor = style.backgroundColor;
    
    // Buttons with solid colors are more prominent
    if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      return 0.8;
    }
    
    return 0.4;
  }

  /**
   * Get font size ratio compared to parent
   */
  static getFontSizeRatio(element) {
    const elementSize = parseInt(window.getComputedStyle(element).fontSize);
    const parentSize = element.parentElement ? 
      parseInt(window.getComputedStyle(element.parentElement).fontSize) : 
      16;
    
    const ratio = elementSize / parentSize;
    // Normalize to 0-1: sizes much larger than parent get higher score
    return Math.min(ratio / 3, 1.0); // Max score at 3x parent size
  }

  /**
   * Get button size score
   */
  static getButtonSize(element) {
    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    
    // Normalize: buttons larger than 10000px² get high score
    return Math.min(area / 10000, 1.0);
  }

  /**
   * Check if element is above the fold
   */
  static isAboveFold(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Above fold if top is in viewport
    return rect.top < windowHeight ? 1.0 : 0.0;
  }

  /**
   * Check if element is fixed position
   */
  static isFixedPosition(element) {
    const position = window.getComputedStyle(element).position;
    return position === 'fixed' ? 1.0 : 0.0;
  }

  /**
   * Get position prominence (elements at top-right are more prominent)
   */
  static getPositionProminence(element) {
    const rect = element.getBoundingClientRect();
    const vScore = 1 - Math.min(rect.top / window.innerHeight, 1.0); // Top = higher score
    const hScore = 1 - Math.min(rect.left / window.innerWidth, 0.5); // Right = higher score
    
    return (vScore * 0.6 + hScore * 0.4);
  }

  /**
   * Count urgency text markers (exclamation marks, caps, etc.)
   */
  static countUrgencyMarkers(text) {
    if (!text) return 0;
    
    const exclamationCount = (text.match(/!/g) || []).length;
    const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
    const urgencyKeywords = ['urgent', 'immediately', 'now', 'limited', 'only', 'hurry', 'rush'];
    
    const urgencyMatches = urgencyKeywords.filter(kw => 
      text.toLowerCase().includes(kw)
    ).length;
    
    // Normalize: max 10 total markers
    return Math.min((exclamationCount * 2 + capsWords + urgencyMatches * 3) / 10, 1.0);
  }

  /**
   * Count scarcity indicators
   */
  static countScarcityIndicators(text) {
    if (!text) return 0;
    
    const scarcityKeywords = ['limited', 'few', 'left', 'stock', 'sold out', 'out of stock', 
                              'only', 'last', 'hurry', 'don\'t miss', 'exclusive'];
    
    const matches = scarcityKeywords.filter(kw => 
      text.toLowerCase().includes(kw)
    ).length;
    
    return Math.min(matches / 5, 1.0);
  }

  /**
   * Get contrast ratio between foreground and background
   */
  static getContrastRatio(element) {
    const style = window.getComputedStyle(element);
    const bgColor = style.backgroundColor;
    const textColor = style.color;
    
    try {
      const bgLum = this.getLuminance(bgColor);
      const textLum = this.getLuminance(textColor);
      
      const lighter = Math.max(bgLum, textLum);
      const darker = Math.min(bgLum, textLum);
      
      const contrast = (lighter + 0.05) / (darker + 0.05);
      
      // Normalize: high contrast (>7) is good for accessibility
      return Math.min(contrast / 7, 1.0);
    } catch (e) {
      return 0.5; // Default middle value
    }
  }

  /**
   * Calculate relative luminance of a color
   */
  static getLuminance(color) {
    // Convert color to RGB
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    
    const imageData = ctx.getImageData(0, 0, 1, 1);
    const [r, g, b] = imageData.data;
    
    // Calculate relative luminance
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;
    
    const adjust = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    
    return 0.2126 * adjust(rsRGB) + 0.7152 * adjust(gsRGB) + 0.0722 * adjust(bsRGB);
  }

  /**
   * Check if element is button-like
   */
  static isButtonLike(element) {
    const tagName = element.tagName.toLowerCase();
    const isButton = tagName === 'button' || 
                     tagName === 'a' ||
                     tagName === 'input' ||
                     element.classList.toString().toLowerCase().includes('btn') ||
                     element.classList.toString().toLowerCase().includes('button') ||
                     element.onclick !== null;
    
    return isButton ? 1.0 : 0.0;
  }

  /**
   * Check if element is hidden
   */
  static isHidden(element) {
    const style = window.getComputedStyle(element);
    const isHidden = style.display === 'none' || 
                     style.visibility === 'hidden' ||
                     style.opacity === '0' ||
                     element.offsetParent === null;
    
    return isHidden ? 1.0 : 0.0;
  }

  /**
   * Get default features when element is null
   */
  static getDefaultFeatures() {
    return {
      urgency_color_score: 0,
      button_prominence: 0,
      font_size_ratio: 0,
      button_size_score: 0,
      is_above_fold: 0,
      is_fixed_position: 0,
      position_prominence: 0,
      urgency_text_markers: 0,
      scarcity_indicators: 0,
      contrast_ratio: 0.5,
      is_button_like: 0,
      is_hidden: 0
    };
  }

  /**
   * Compute overall visual deception score (0-1)
   */
  static computeOverallScore(features) {
    if (!features) return 0;
    
    // Weighted combination of features
    const weights = {
      urgency_color_score: 0.12,
      button_prominence: 0.10,
      font_size_ratio: 0.08,
      button_size_score: 0.10,
      is_above_fold: 0.08,
      is_fixed_position: 0.12,
      position_prominence: 0.10,
      urgency_text_markers: 0.12,
      scarcity_indicators: 0.10,
      is_button_like: 0.05,
      // Note: High contrast is GOOD, so we invert it
      contrast_ratio: -0.05 // Negative weight
    };
    
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      if (features.hasOwnProperty(key)) {
        score += features[key] * weight;
      }
    }
    
    // Invert contrast so high contrast reduces score
    score += (1 - features.contrast_ratio) * 0.05;
    
    return Math.max(0, Math.min(score, 1.0));
  }
}

// Export for use in content.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisualFeatureExtractor;
}
