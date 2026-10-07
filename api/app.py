from flask import Flask, jsonify, request
from flask_cors import CORS
from joblib import load
import numpy as np

presence_classifier = load('presence_classifier.joblib')
presence_vect = load('presence_vectorizer.joblib')
category_classifier = load('category_classifier.joblib')
category_vect = load('category_vectorizer.joblib')

app = Flask(__name__)
CORS(app)

# Weights for multimodal fusion
TEXT_WEIGHT = 0.7
VISUAL_WEIGHT = 0.3

def get_text_prediction_confidence(token, classifier, vectorizer):
    """
    Get confidence score for text prediction (0-1)
    """
    try:
        prediction = classifier.predict(vectorizer.transform([token]))
        # Get probability for 'Dark' class if available
        if hasattr(classifier, 'predict_proba'):
            proba = classifier.predict_proba(vectorizer.transform([token]))
            # Return probability of 'Dark' class
            classes = classifier.classes_
            dark_idx = np.where(classes == 'Dark')[0]
            if len(dark_idx) > 0:
                return proba[0][dark_idx[0]]
        # Fallback: return 1.0 if prediction is 'Dark', else 0.0
        return 1.0 if prediction[0] == 'Dark' else 0.0
    except:
        return 0.5

def fuse_predictions(text_token, visual_features):
    """
    Multimodal fusion: Combine text-based and visual-based predictions
    Args:
        text_token: The text content
        visual_features: Dict of visual features from frontend
    Returns:
        tuple: (fused_prediction, fused_confidence, explanation)
    """
    # Get text-based prediction
    text_presence_confidence = get_text_prediction_confidence(
        text_token, presence_classifier, presence_vect
    )
    
    # Get visual-based score
    visual_score = 0
    if visual_features:
        # Weight important visual features
        visual_weights = {
            'urgency_color_score': 0.15,
            'is_fixed_position': 0.15,
            'urgency_text_markers': 0.15,
            'button_prominence': 0.12,
            'position_prominence': 0.12,
            'scarcity_indicators': 0.12,
            'is_above_fold': 0.10,
            'font_size_ratio': 0.09
        }
        
        for feature, weight in visual_weights.items():
            if feature in visual_features:
                visual_score += visual_features[feature] * weight
    
    # Multimodal fusion: weighted combination
    fused_confidence = (TEXT_WEIGHT * text_presence_confidence + 
                       VISUAL_WEIGHT * visual_score)
    
    # Decision threshold (0.5)
    is_dark = fused_confidence > 0.5
    
    explanation = {
        'text_score': round(text_presence_confidence, 3),
        'visual_score': round(visual_score, 3),
        'fused_score': round(fused_confidence, 3),
        'is_dark': is_dark
    }
    
    if is_dark:
        # Get category
        category = category_classifier.predict(category_vect.transform([text_token]))[0]
        return category, fused_confidence, explanation
    else:
        return 'Not Dark', fused_confidence, explanation

@app.route('/', methods=['POST'])
def main():
    """
    Main endpoint for multimodal dark pattern detection
    Expected JSON:
    {
        'tokens': ['text1', 'text2', ...],
        'visual_features': [
            {feature_dict_1},
            {feature_dict_2},
            ...
        ]
    }
    """
    if request.method == 'POST':
        output = []
        explanations = []
        data = request.get_json().get('tokens', [])
        visual_features_list = request.get_json().get('visual_features', [])
        
        # If no visual features provided, use empty dicts
        if not visual_features_list:
            visual_features_list = [None] * len(data)

        for i, token in enumerate(data):
            visual_features = visual_features_list[i] if i < len(visual_features_list) else None
            
            result, confidence, explanation = fuse_predictions(token, visual_features)
            output.append(result)
            explanation['text'] = token
            explanations.append(explanation)

        dark_count = sum(1 for r in output if r == 'Dark')
        dark_texts = [data[i] for i in range(len(output)) if output[i] != 'Not Dark']
        
        print(f"Dark patterns detected: {dark_count}")
        for d in dark_texts:
            print(f"  - {d}")
        print()

        # Convert numpy types to Python native types for JSON serialization
        def convert_types(obj):
            """Convert numpy types to python native types"""
            import numpy as np
            if isinstance(obj, np.bool_):
                return bool(obj)
            elif isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, dict):
                return {k: convert_types(v) for k, v in obj.items()}
            elif isinstance(obj, (list, tuple)):
                return [convert_types(item) for item in obj]
            return obj

        # Convert all explanations to JSON-serializable format
        serializable_explanations = [convert_types(exp) for exp in explanations]

        response = {
            'result': output,
            'dark_count': int(dark_count),
            'detailed_results': serializable_explanations,
            'mode': 'multimodal'
        }

        return jsonify(response)

if __name__ == '__main__':
    app.run(threaded=True, debug=True)
