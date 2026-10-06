import os
import pandas as pd

DATASET_DIR = "../dataset"

EXPECTED_FEATURES = 126
EXPECTED_COLUMNS = EXPECTED_FEATURES + 1


def validate_file(filename):
    path = os.path.join(DATASET_DIR, filename)

    print()
    print("=" * 50)
    print(f"Checking: {filename}")
    print("=" * 50)

    try:
        df = pd.read_csv(path)
    except Exception as ex:
        print(f"[ERROR] Could not read file: {ex}")
        return False

    valid = True

    # Column Count

    if len(df.columns) != EXPECTED_COLUMNS:
        print(
            f"[ERROR] Expected {EXPECTED_COLUMNS} columns, "
            f"found {len(df.columns)}"
        )

        valid = False

    else:
        print(
            f"[OK] Column count: {len(df.columns)}"
        )

    # Empty Dataset

    if len(df) == 0:
        print("[ERROR] Dataset contains no samples.")
        
        valid = False

    else:
        print(f"[OK] Samples: {len(df)}")

    # Label

    if "label" not in df.columns:
        print("[ERROR] Missing label column.")

        valid = False

    else:
        labels = df["label"].unique()
        print(f"[OK] Labels: {list(labels)}")
    
    # Missing Values

    missing_values = df.isnull().sum().sum()

    if missing_values > 0:
        print(f"[ERROR] Missing values: {missing_values}")
        
        valid = False
    
    else:
        print("[OK] No missing values.")

    # Numeric features

    feature_columns = [
        column
        for column in df.columns
        if column != "label"
    ]

    non_numeric = []

    for column in feature_columns:
        if not pd.api.types.is_numeric_dtype(df[column]):
            non_numeric.append(column)
        
    if non_numeric:
        print("[ERROR] Non-numeric feature columns:")

        for column in non_numeric:
            print(f"    {column}")

        valid = False
    
    else:
        print("[OK] All features are numeric")

    # Range Check

    feature_data = df[feature_columns]

    max_value = feature_data.max().max()
    min_value = feature_data.min().min()

    print(
        f"[INFO] Feature range: "
        f"{min_value:.4f} -> {max_value:.4f}"
    )

    # Result

    if valid:
        print("[VALID] Dataset looks good.")

    else:
        print("[INVALID] Dataset needs attention.")

    return valid


# Main

def main():
    if not os.path.exists(DATASET_DIR):
        print(
            f"ERROR: Dataset directory "
            f"'{DATASET_DIR}' does not exist."
        )

        return

    files = [
        filename
        for filename in os.listdir(DATASET_DIR)
        if filename.endswith(".csv")
    ]

    if not files:
        print("No CSV files found.")
        return
    
    print()
    print("======================================")
    print(" Naruto Dataset Validator")
    print("======================================")

    all_valid = True

    for filename in sorted(files):
        if not validate_file(filename):
            all_valid = False

    print()
    print("======================================")

    if all_valid:
        print("ALL DATASETS VALID")

    else:
        print("SOME DATASETS HAVE ERRORS")

    print("======================================")


if __name__ == "__main__":
    main()        