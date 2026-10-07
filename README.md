# Dark Pattern Detection System

A lightweight **multimodal system for detecting deceptive dark patterns in web interfaces** by combining text-based machine learning with browser-based visual and DOM analysis.

## Overview

Dark patterns are deceptive user-interface techniques designed to influence or manipulate users into making unintended decisions.

This project combines **natural language processing, DOM analysis, and visual feature extraction** to identify potential dark patterns in web pages.

The system consists of a **Chrome extension** that extracts webpage information and a **Flask backend** that performs machine-learning-based classification.

## Key Features

* **Text Classification:** Uses TF-IDF features with Multinomial Naive Bayes to classify dark-pattern categories.
* **DOM Analysis:** Extracts relevant webpage content and structural information through the browser extension.
* **Visual Feature Analysis:** Analyzes visual attributes of webpage elements as an additional detection signal.
* **Multimodal Detection:** Combines textual and visual/DOM-based signals to improve detection compared with a text-only approach.
* **Chrome Extension:** Provides a browser-based interface for analyzing webpages.
* **Flask Backend:** Handles model inference and communication with the extension.

## System Architecture

```text
Web Page
   │
   ├── Text / DOM Content
   │
   └── Visual Features
          │
          ▼
   Chrome Extension
          │
          ▼
     Flask Backend
          │
          ├── TF-IDF Vectorization
          ├── Text Classification
          └── Visual Feature Analysis
          │
          ▼
   Dark Pattern Detection
   + Category Classification
```

## Machine Learning

The text-based detection pipeline uses:

* **TF-IDF** for text feature extraction
* **Multinomial Naive Bayes** for classification
* Separate models for dark-pattern **presence** and **category** detection
* Multimodal evaluation to compare text-based and combined detection approaches

The system improved detection accuracy from **87% to 92%**, with F1-score improving from **0.84 to 0.90** over the text-only baseline.

## Technologies

**Languages:** Python, JavaScript, HTML, CSS

**Machine Learning:** Scikit-learn, TF-IDF, Multinomial Naive Bayes

**Backend:** Flask

**Browser:** Chrome Extension APIs, DOM

## Project Structure

```text
├── api/                  # Flask backend and trained models
├── app/                  # Chrome extension
├── train_classifier/     # Training and evaluation scripts
├── EXAMPLE_RESULTS.md    # Example detection results
├── SETUP_GUIDE.md        # Setup and usage instructions
└── MULTIMODAL_README.md  # Additional project documentation
```

## Research

This project was developed as part of research on **multimodal dark-pattern detection**.

**Research paper:** Accepted at the **PEACE Conference**.

## Authors

**Kaushika YJ**

This project was developed collaboratively.
