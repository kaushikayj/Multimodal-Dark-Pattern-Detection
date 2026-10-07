"""
Evaluation Script for Multimodal Dark Pattern Detection
Compares text-only vs. multimodal (text + visual) approaches
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from joblib import load
import json
import os

# Load classifiers
presence_classifier = load('presence_classifier.joblib')
presence_vect = load('presence_vectorizer.joblib')
category_classifier = load('category_classifier.joblib')
category_vect = load('category_vectorizer.joblib')

class MultimodalEvaluator:
    """Evaluate multimodal dark pattern detection"""
    
    def __init__(self):
        self.text_weight = 0.7
        self.visual_weight = 0.3
    
    def get_text_prediction_confidence(self, token):
        """Get confidence score for text prediction"""
        try:
            prediction = presence_classifier.predict(presence_vect.transform([token]))
            if hasattr(presence_classifier, 'predict_proba'):
                proba = presence_classifier.predict_proba(presence_vect.transform([token]))
                classes = presence_classifier.classes_
                dark_idx = np.where(classes == 'Dark')[0]
                if len(dark_idx) > 0:
                    return proba[0][dark_idx[0]]
            return 1.0 if prediction[0] == 'Dark' else 0.0
        except:
            return 0.5
    
    def simulate_visual_features(self, text):
        """
        Simulate visual features extracted from DOM
        In real scenario, these come from the browser extension
        """
        features = {
            'urgency_color_score': 0,
            'button_prominence': 0,
            'font_size_ratio': 0,
            'button_size_score': 0,
            'is_above_fold': 0,
            'is_fixed_position': 0,
            'position_prominence': 0,
            'urgency_text_markers': 0,
            'scarcity_indicators': 0,
            'is_button_like': 0,
            'contrast_ratio': 0.5
        }
        
        # Heuristic-based simulation (would be real values from extension)
        text_lower = text.lower()
        
        # Urgency detection
        urgency_words = ['limited', 'only', 'now', 'urgent', 'hurry', 'rush', 'immediately']
        if any(word in text_lower for word in urgency_words):
            features['urgency_text_markers'] = 0.8
            features['urgency_color_score'] = 0.4
        
        # Scarcity detection
        scarcity_words = ['left', 'few', 'stock', 'sold out', 'limited', 'exclusive']
        if any(word in text_lower for word in scarcity_words):
            features['scarcity_indicators'] = 0.7
        
        # Button detection
        if any(word in text_lower for word in ['buy', 'click', 'add', 'purchase', 'get', 'subscribe']):
            features['is_button_like'] = 0.8
            features['button_prominence'] = 0.6
        
        # Position/prominence (simulated)
        if len(text) < 50 and any(word in text_lower for word in urgency_words):
            features['is_above_fold'] = 0.9
            features['position_prominence'] = 0.7
        
        return features
    
    def compute_visual_score(self, visual_features):
        """Compute overall visual deception score"""
        if not visual_features:
            return 0
        
        weights = {
            'urgency_color_score': 0.15,
            'is_fixed_position': 0.15,
            'urgency_text_markers': 0.15,
            'button_prominence': 0.12,
            'position_prominence': 0.12,
            'scarcity_indicators': 0.12,
            'is_above_fold': 0.10,
            'font_size_ratio': 0.09
        }
        
        score = 0
        for feature, weight in weights.items():
            if feature in visual_features:
                score += visual_features[feature] * weight
        
        return min(score, 1.0)
    
    def fuse_predictions(self, text_token, visual_features=None):
        """Multimodal fusion"""
        text_score = self.get_text_prediction_confidence(text_token)
        visual_score = self.compute_visual_score(visual_features) if visual_features else 0
        
        fused_score = (self.text_weight * text_score + 
                      self.visual_weight * visual_score)
        
        return fused_score, text_score, visual_score
    
    def evaluate(self, texts, true_labels):
        """
        Evaluate both text-only and multimodal approaches
        """
        text_only_predictions = []
        multimodal_predictions = []
        fused_scores = []
        text_scores = []
        visual_scores = []
        
        print("=" * 80)
        print("MULTIMODAL DARK PATTERN DETECTION EVALUATION")
        print("=" * 80)
        print()
        
        for text, label in zip(texts, true_labels):
            # Text-only prediction
            text_score = self.get_text_prediction_confidence(text)
            text_pred = 'Dark' if text_score > 0.5 else 'Not Dark'
            text_only_predictions.append(1 if text_pred == 'Dark' else 0)
            
            # Simulate visual features
            visual_features = self.simulate_visual_features(text)
            
            # Multimodal fusion
            fused_score, t_score, v_score = self.fuse_predictions(text, visual_features)
            multimodal_pred = 'Dark' if fused_score > 0.5 else 'Not Dark'
            multimodal_predictions.append(1 if multimodal_pred == 'Dark' else 0)
            
            fused_scores.append(fused_score)
            text_scores.append(t_score)
            visual_scores.append(v_score)
        
        # Prepare label array (1 for 'Dark', 0 for 'Not Dark')
        true_labels_binary = [1 if label == 'Dark' else 0 for label in true_labels]
        
        # Metrics computation
        text_accuracy = accuracy_score(true_labels_binary, text_only_predictions)
        text_precision = precision_score(true_labels_binary, text_only_predictions, zero_division=0)
        text_recall = recall_score(true_labels_binary, text_only_predictions, zero_division=0)
        text_f1 = f1_score(true_labels_binary, text_only_predictions, zero_division=0)
        
        multimodal_accuracy = accuracy_score(true_labels_binary, multimodal_predictions)
        multimodal_precision = precision_score(true_labels_binary, multimodal_predictions, zero_division=0)
        multimodal_recall = recall_score(true_labels_binary, multimodal_predictions, zero_division=0)
        multimodal_f1 = f1_score(true_labels_binary, multimodal_predictions, zero_division=0)
        
        # Print results
        print("TEXT-ONLY APPROACH (Naive Bayes)")
        print("-" * 80)
        print(f"Accuracy:  {text_accuracy:.4f}")
        print(f"Precision: {text_precision:.4f}")
        print(f"Recall:    {text_recall:.4f}")
        print(f"F1-Score:  {text_f1:.4f}")
        print()
        
        print("MULTIMODAL APPROACH (Text + Visual Features)")
        print("-" * 80)
        print(f"Accuracy:  {multimodal_accuracy:.4f}")
        print(f"Precision: {multimodal_precision:.4f}")
        print(f"Recall:    {multimodal_recall:.4f}")
        print(f"F1-Score:  {multimodal_f1:.4f}")
        print()
        
        print("IMPROVEMENT (Multimodal vs. Text-Only)")
        print("-" * 80)
        print(f"Accuracy Improvement:  +{(multimodal_accuracy - text_accuracy) * 100:.2f}%")
        print(f"Precision Improvement: +{(multimodal_precision - text_precision) * 100:.2f}%")
        print(f"Recall Improvement:    +{(multimodal_recall - text_recall) * 100:.2f}%")
        print(f"F1-Score Improvement:  +{(multimodal_f1 - text_f1) * 100:.2f}%")
        print()
        
        # Detailed analysis
        print("DETAILED ANALYSIS")
        print("-" * 80)
        
        # Find cases where multimodal helped
        improved_cases = []
        degraded_cases = []
        
        for i in range(len(texts)):
            text_pred = text_only_predictions[i]
            multi_pred = multimodal_predictions[i]
            true_label = true_labels_binary[i]
            
            # Case where multimodal was correct and text was wrong
            if multi_pred == true_label and text_pred != true_label:
                improved_cases.append((texts[i], 'Corrected'))
            
            # Case where text was correct but multimodal was wrong
            if text_pred == true_label and multi_pred != true_label:
                degraded_cases.append((texts[i], 'Degraded'))
        
        print(f"Cases where multimodal improved prediction: {len(improved_cases)}")
        for text, _ in improved_cases[:5]:
            print(f"  - {text[:60]}...")
        
        if degraded_cases:
            print(f"\nCases where multimodal degraded prediction: {len(degraded_cases)}")
            for text, _ in degraded_cases[:5]:
                print(f"  - {text[:60]}...")
        
        print()
        print("=" * 80)
        
        return {
            'text_metrics': {
                'accuracy': text_accuracy,
                'precision': text_precision,
                'recall': text_recall,
                'f1': text_f1
            },
            'multimodal_metrics': {
                'accuracy': multimodal_accuracy,
                'precision': multimodal_precision,
                'recall': multimodal_recall,
                'f1': multimodal_f1
            },
            'improvements': {
                'accuracy': (multimodal_accuracy - text_accuracy) * 100,
                'precision': (multimodal_precision - text_precision) * 100,
                'recall': (multimodal_recall - text_recall) * 100,
                'f1': (multimodal_f1 - text_f1) * 100
            }
        }


def run_evaluation():
    """Run evaluation on dark patterns dataset"""
    
    # Load dataset
    print("Loading dark patterns dataset...")
    df = pd.read_csv('dark_patterns.csv')
    df = df[pd.notnull(df["Pattern String"])]
    
    # Sample for evaluation
    dark_samples = df.sample(min(100, len(df)), random_state=42)
    
    texts = dark_samples["Pattern String"].tolist()
    labels = ['Dark'] * len(texts)  # These are all from dark_patterns.csv
    
    # Evaluate
    evaluator = MultimodalEvaluator()
    results = evaluator.evaluate(texts, labels)
    
    # Save results
    with open('multimodal_evaluation_results.json', 'w') as f:
        # Convert numpy types to native Python types for JSON serialization
        results_serializable = {
            'text_metrics': {k: float(v) for k, v in results['text_metrics'].items()},
            'multimodal_metrics': {k: float(v) for k, v in results['multimodal_metrics'].items()},
            'improvements': {k: float(v) for k, v in results['improvements'].items()}
        }
        json.dump(results_serializable, f, indent=2)
    
    print("\nResults saved to multimodal_evaluation_results.json")


if __name__ == '__main__':
    run_evaluation()
