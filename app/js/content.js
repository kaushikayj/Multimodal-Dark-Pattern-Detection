const endpoint = "http:/127.0.0.1:5000/";
const descriptions = {
  "Sneaking": "Coerces users to act in ways that they would not normally act by obscuring information.",
  "Urgency": "Places deadlines on things to make them appear more desirable",
  "Misdirection": "Aims to deceptively incline a user towards one choice over the other.",
  "Social Proof": "Gives the perception that a given action or product has been approved by other people.",
  "Scarcity": "Tries to increase the value of something by making it appear to be limited in availability.",
  "Obstruction": "Tries to make an action more difficult so that a user is less likely to do that action.",
  "Forced Action": "Forces a user to complete extra, unrelated tasks to do something that should be simple.",
};

/**
 * Extract visual features from DOM element
 * Simplified version of VisualFeatureExtractor for content.js
 */
function extractVisualFeatures(element, text) {
  if (!element || !text) return null;

  try {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // Color urgency score
    const bgColor = style.backgroundColor;
    const textColor = style.color;
    const isRedish = bgColor.includes('rgb') && 
                     (bgColor.match(/(\d+)/g) || []).length >= 3 &&
                     parseInt((bgColor.match(/(\d+)/g) || [])[0]) > 150;
    
    const urgencyColorScore = (isRedish || bgColor.includes('red') || bgColor.includes('orange')) ? 0.8 : 0;
    
    // Position features
    const isAboveFold = rect.top < window.innerHeight ? 1.0 : 0.0;
    const isFixedPosition = style.position === 'fixed' ? 1.0 : 0.0;
    const positionProminence = (1 - Math.min(rect.top / window.innerHeight, 1.0)) * 0.6 + 
                               (1 - Math.min(rect.left / window.innerWidth, 0.5)) * 0.4;
    
    // Size features
    const fontSize = parseInt(style.fontSize);
    const parentFontSize = element.parentElement ? 
      parseInt(window.getComputedStyle(element.parentElement).fontSize) : 16;
    const fontSizeRatio = Math.min((fontSize / parentFontSize) / 3, 1.0);
    
    const buttonArea = rect.width * rect.height;
    const buttonSizeScore = Math.min(buttonArea / 10000, 1.0);
    
    // Button prominence
    const isButton = ['BUTTON', 'A', 'INPUT'].includes(element.tagName) ||
                     element.classList.toString().toLowerCase().includes('btn');
    const buttonProminence = isButton && bgColor !== 'rgba(0, 0, 0, 0)' ? 0.8 : 0;
    
    // Text urgency markers
    const textLower = text.toLowerCase();
    const exclamationCount = (text.match(/!/g) || []).length;
    const urgencyWords = ['urgent', 'immediately', 'now', 'limited', 'only', 'hurry'];
    const urgencyMatches = urgencyWords.filter(w => textLower.includes(w)).length;
    const urgencyTextMarkers = Math.min((exclamationCount * 2 + urgencyMatches * 3) / 10, 1.0);
    
    // Scarcity indicators
    const scarcityWords = ['limited', 'few', 'left', 'stock', 'sold out', 'only', 'last'];
    const scarcityMatches = scarcityWords.filter(w => textLower.includes(w)).length;
    const scarcityIndicators = Math.min(scarcityMatches / 5, 1.0);
    
    // Is button-like
    const isButtonLike = isButton ? 1.0 : 0.0;
    
    return {
      urgency_color_score: urgencyColorScore,
      button_prominence: buttonProminence,
      font_size_ratio: fontSizeRatio,
      button_size_score: buttonSizeScore,
      is_above_fold: isAboveFold,
      is_fixed_position: isFixedPosition,
      position_prominence: positionProminence,
      urgency_text_markers: urgencyTextMarkers,
      scarcity_indicators: scarcityIndicators,
      is_button_like: isButtonLike,
      contrast_ratio: 0.5 // Default value
    };
  } catch (e) {
    console.warn("Error extracting visual features:", e);
    return null;
  }
}

function scrape() {
  // website has already been analyzed
  if (document.getElementById("insite_count")) {
    return;
  }

  // aggregate all DOM elements on the page
  let elements = segments(document.body);
  let filtered_elements = [];
  let visual_features_list = [];

  for (let i = 0; i < elements.length; i++) {
    let text = elements[i].innerText.trim().replace(/\t/g, " ");
    if (text.length == 0) {
      continue;
    }
    filtered_elements.push(text);
    // Extract visual features for this element
    const visualFeatures = extractVisualFeatures(elements[i], text);
    visual_features_list.push(visualFeatures);
  }

  // Post to the web server with multimodal data (text + visual features)
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      tokens: filtered_elements,
      visual_features: visual_features_list  // NEW: Include visual features
    }),
  })
    .then((resp) => resp.json())
    .then((data) => {
      // Handle new response format from multimodal API
      let dp_count = 0;
      let element_index = 0;
      
      const results = data.result || [];
      const detailedResults = data.detailed_results || [];

      for (let i = 0; i < elements.length; i++) {
        let text = elements[i].innerText.trim().replace(/\t/g, " ");
        if (text.length == 0) {
          continue;
        }

        if (results[element_index] !== "Not Dark") {
          // Enhanced highlight with confidence score
          const confidence = detailedResults[element_index]?.fused_score || 0;
          highlight(elements[i], results[element_index], confidence);
          dp_count++;
        }
        element_index++;
      }

      // store number of dark patterns
      let g = document.createElement("div");
      g.id = "insite_count";
      g.value = dp_count;
      g.style.opacity = 0;
      g.style.position = "fixed";
      document.body.appendChild(g);
      sendDarkPatterns(g.value);
    })
    .catch((error) => {
      console.error("Error in scrape:", error);
      alert("Error: " + error);
    });
}

function highlight(element, type, confidence = 0.5) {
  element.classList.add("insite-highlight");

  let body = document.createElement("span");
  body.classList.add("insite-highlight-body");

  /* header */
  let header = document.createElement("div");
  header.classList.add("modal-header");
  let headerText = document.createElement("h1");
  const confidencePercent = Math.round(confidence * 100);
  headerText.innerHTML = type + " Pattern (" + confidencePercent + "% confidence)";
  header.appendChild(headerText);
  body.appendChild(header);

  /* content */
  let content = document.createElement("div");
  content.classList.add("modal-content");
  content.innerHTML = descriptions[type];
  body.appendChild(content);

  element.appendChild(body);
}

function sendDarkPatterns(number) {
  chrome.runtime.sendMessage({
    message: "update_current_count",
    count: number,
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === "analyze_site") {
    scrape();
  } else if (request.message === "popup_open") {
    let element = document.getElementById("insite_count");
    if (element) {
      sendDarkPatterns(element.value);
    }
  }
});
