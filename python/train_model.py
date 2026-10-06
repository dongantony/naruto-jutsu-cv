print("train_model.py STARTED")

import os
import glob
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix


# Settings

DATASET_DIR = "../dataset"
MODEL_OUTPUT = "../hand_sign_model.pkl"

TEST_SIZE = 0.20
RANDOM_STATE = 42

N_ESTIMATORS = 300


# Load Dataset

def load_dataset():
    files = glob.glob(os.path.join(DATASET_DIR, "*.csv"))

    if not files:
        raise RuntimeError(f"No CSV files found in '{DATASET_DIR}'")

    print()
    print("Dataset files:")

    for file in sorted(files):
        print(f"  - {os.path.basename(file)}")

    dataframes = []

    for file in sorted(files):
        df = pd.read_csv(file)

        if "label" not in df.columns:
            raise ValueError(f"Missing 'label' column in {file}")
        
        dataframes.append(df)

    combined = pd.concat(dataframes, ignore_index=True)

    return combined


# Prepare Features

def prepare_data(df):
    X = df.drop(columns=["label"])
    Y = df["label"]

    X = X.apply(pd.to_numeric, errors="raise")     # Make sure every feature is numeric

    return X, Y


# Train Model

def train_model(X_train, Y_train):

    model = RandomForestClassifier(
        n_estimators=N_ESTIMATORS, 
        random_state=RANDOM_STATE, 
        n_jobs=-1, 
        class_weight="balanced"
    )

    print()
    print("Training Random Forest...")

    model.fit(X_train, Y_train)

    return model


# Evaluate Model

def evaluate_model(model, X_test, Y_test):
    predictions = model.predict(X_test)
    accuracy = accuracy_score(Y_test, predictions)

    print()
    print("======================================")
    print(" Model Results")
    print("======================================")

    print()
    print(f"Accuracy: {accuracy:.4f}")

    print()
    print("Classification Report:")
    print()

    print(classification_report(Y_test, predictions))

    print("Confusion Matrix:")
    print()

    labels = sorted(Y_test.unique())

    matrix = confusion_matrix(Y_test, predictions, labels=labels)
    matrix_df = pd.DataFrame(matrix, index=labels, columns=labels)

    print(matrix_df)
    print()


# Save Model

def save_model(model, feature_columns):
    model_data = {
        "model": model,
        "feature_columns": list(feature_columns)
    }

    joblib.dump(model_data, MODEL_OUTPUT)

    print(f"Model saved to: {MODEL_OUTPUT}")


# Main

def main():
    print()
    print("======================================")
    print(" Naruto Hand Sign Trainer")
    print("======================================")
    
    # Load

    df = load_dataset()
    
    print()
    print(f"Total Samples: {len(df)}")
    print(f"Total Columns: {len(df.columns)}")

    # Show Classes

    print()
    print("Classes:")

    class_counts = df["label"].value_counts()

    for label, count in class_counts.items():
        print(f"  {label}: {count} samples")
    
    # Prepare

    X, Y = prepare_data(df)

    print()
    print(f"Features: {X.shape[1]}")

    # Train/Test Split

    X_train, X_test, Y_train, Y_test = train_test_split(
        X, Y,
        test_size = TEST_SIZE,
        random_state = RANDOM_STATE,
        stratify = Y
    )

    print()
    print(f"Training Samples: {len(X_train)}")
    print(f"Testing Samples: {len(X_test)}")

    # Train

    model = train_model(X_train, Y_train)

    # Evaluate 

    evaluate_model(model, X_test, Y_test)

    # Save

    save_model(model, X.columns)

    print()
    print("======================================")
    print(" Training Complete")
    print("======================================")


if __name__ == "__main__":
    main()