print("test_model.py STARTED")

import os 
import glob
import joblib
import pandas as pd

from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix)


# Settings

TEST_DATASET_DIR = "../dataset-test"
MODEL_PATH = "../hand_sign_model.pkl"


# Load Model

def load_model():
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Could not find model: {MODEL_PATH}")

    model_data = joblib.load(MODEL_PATH)

    return (model_data["model"], model_data["feature_columns"])


# Load Test Dataset

def load_test_data():
    files = glob.glob(os.path.join(TEST_DATASET_DIR, "*.csv"))

    if not files:
        raise RuntimeError(
            f"No CSV files found in "
            f"'{TEST_DATASET_DIR}'"
        )
    
    dataframes = []

    for file in sorted(files):
        print(f"Loading: {os.path.basename(file)}")

        df = pd.read_csv(file)
        dataframes.append(df)

    return pd.concat(dataframes, ignore_index=True)


# Main

def main():
    print()
    print("======================================")
    print(" Naruto Hand Sign Model Tester")
    print("======================================")
    print()

    # Model

    model, feature_columns = load_model()

    print(f"Model loaded: {MODEL_PATH}")

    # Test Dataset

    df = load_test_data()

    print()
    print(f"Test samples: {len(df)}")

    # Features

    X = df[feature_columns]
    Y = df["label"]

    # Predictions

    predictions = model.predict(X)

    # Accuracy 

    accuracy = accuracy_score(Y, predictions)

    print()
    print("======================================")
    print(" TEST RESULTS")
    print("======================================")
    print()

    print(f"Accuracy: {accuracy:.4f}")

    # Classification Report

    print()
    print("Classification Report:")
    print()

    print(classification_report(Y, predictions))

    # Confusion Matrix

    labels = sorted(Y.unique())

    matrix = confusion_matrix(Y, predictions, labels=labels)
    matrix_df = pd.DataFrame(matrix, index=labels, columns=labels)

    print("Confusion Matrix:")
    print()
    print(matrix_df)
    print()
    

if __name__ == "__main__":
    main()