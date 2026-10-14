import sys
import json
import os
import cv2
import numpy as np

import easyocr

reader = easyocr.Reader(['en'], gpu=False, verbose=False)

def preprocess_image(image_path):
    """Light preprocessing for better OCR on ID cards"""
    img = cv2.imread(image_path)
    if img is None:
        return image_path

    height, width = img.shape[:2]

    # Upscale small images
    if width < 800:
        scale = 800 / width
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    preprocessed_path = image_path + "_pre.png"
    cv2.imwrite(preprocessed_path, binary)
    return preprocessed_path

def extract_text(image_path):
    try:
        processed_path = preprocess_image(image_path)

        # Run OCR on both original and preprocessed
        results_original = reader.readtext(image_path, paragraph=False)
        results_processed = reader.readtext(processed_path, paragraph=False)

        avg_orig = sum(r[2] for r in results_original) / max(len(results_original), 1)
        avg_proc = sum(r[2] for r in results_processed) / max(len(results_processed), 1)

        results = results_processed if avg_proc > avg_orig else results_original

        text_lines = []
        structured = []

        for (bbox, text, confidence) in results:
            text_lines.append(text)
            box = [[int(coord) for coord in point] for point in bbox]
            structured.append({
                "text": text,
                "confidence": round(float(confidence), 4),
                "box": box
            })

        # Cleanup
        if os.path.exists(processed_path):
            os.remove(processed_path)

        output = {
            "raw_text": "\n".join(text_lines),
            "structured": structured
        }
        print(json.dumps(output, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({
            "raw_text": "",
            "structured": [],
            "error": str(e)
        }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "raw_text": "",
            "structured": [],
            "error": "No image path provided"
        }))
    else:
        extract_text(sys.argv[1])
