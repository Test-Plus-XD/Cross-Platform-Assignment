#!/usr/bin/env python3
# Import required libraries
import argparse
import json
import re
from pathlib import Path
import sys

# Try to import pandas and give a helpful error if missing
try:
    import pandas as pd
except ImportError:
    print("Error: pandas is required but not installed.")
    print("Install it by running: python -m pip install pandas")
    sys.exit(1)

# Parse CLI args
def parse_args():
    parser = argparse.ArgumentParser(
        description="Filter FEHD CSV for vegetarian restaurants and output selected fields as JSON"
    )
    parser.add_argument("--input", "-i", required=True, help="Path to input CSV (e.g. FEHD_RL_converted.csv)")
    parser.add_argument("--output", "-o", default="vegetarian_restaurants_selected.json", help="Path to output JSON")
    parser.add_argument("--min_matches", "-m", type=int, default=1, help="Minimum keyword matches to include row")
    return parser.parse_args()

# Helper to safely convert lat/long to float or None
def to_float_or_none(val):
    if pd.isna(val):
        return None
    try:
        return float(val)
    except Exception:
        # Try removing commas/whitespace then convert
        try:
            return float(str(val).replace(",", "").strip())
        except Exception:
            return None

# Main processing function
def filter_and_select(input_path, output_path, min_matches=1):
    df = pd.read_csv(input_path, dtype=str)

    # Columns expected in FEHD; if absent we fall back to empty strings
    # Note: NSEARCH03_EN/TC typically hold establishment names
    col_map = {
        "Name_EN": ["NSEARCH03_EN", "NAME_EN", "NSEARCH03", "ESTABLISHMENT_NAME_EN"],
        "Name_TC": ["NSEARCH03_TC", "NAME_TC", "NSEARCH03_TC"],
        "Address_EN": ["ADDRESS_EN", "ADDRESS"],
        "Address_TC": ["ADDRESS_TC"],
        "District_EN": ["SEARCH01_EN"],
        "District_TC": ["SEARCH01_TC"],
        "Latitude": ["LATITUDE"],
        "Longitude": ["LONGITUDE"]
    }

    # Build available search columns for keyword detection (names + addresses etc.)
    search_columns = []
    for candidates in (col_map["Name_EN"] + col_map["Name_TC"] + ["ADDRESS_EN", "ADDRESS_TC", "DATASET_EN", "DATASET_TC", "NAME_EN", "NAME_TC"]):
        if candidates in df.columns and candidates not in search_columns:
            search_columns.append(candidates)
    if not search_columns:
        # fallback: all string columns
        search_columns = df.select_dtypes(include="object").columns.tolist()

    # English and Chinese keyword patterns
    eng_keywords = ["vegetarian","vegan","veggie","vegan-friendly","vegetarian-friendly","plant-based","plant based","pure veg","pure-veg","veg"]
    eng_pattern = re.compile(r"\b(" + "|".join(re.escape(k) for k in eng_keywords) + r")\b", flags=re.IGNORECASE)
    cn_keywords = ["素食","純素","全素","齋","素菜","素食館","素食店","素餐","素齋","素家"]

    matched = []
    for _, row in df.iterrows():
        en_matches = []
        cn_matches = []
        for col in search_columns:
            val = row.get(col, "")
            if not isinstance(val, str):
                continue
            # English matches
            for m in eng_pattern.findall(val):
                token = m.lower()
                if token not in en_matches:
                    en_matches.append(token)
            # Chinese matches
            for kw in cn_keywords:
                if kw in val and kw not in cn_matches:
                    cn_matches.append(kw)
        if (len(en_matches) + len(cn_matches)) >= min_matches:
            # Build selected output record with _EN and _TC suffixes
            out = {}
            # Name fields
            def first_existing(candidates):
                for c in candidates:
                    if c in df.columns:
                        v = row.get(c)
                        if isinstance(v, str) and v.strip() != "":
                            return v.strip()
                return ""
            out["Name_EN"] = first_existing(col_map["Name_EN"])
            out["Name_TC"] = first_existing(col_map["Name_TC"])
            out["Address_EN"] = first_existing(col_map["Address_EN"])
            out["Address_TC"] = first_existing(col_map["Address_TC"])
            out["District_EN"] = first_existing(col_map["District_EN"])
            out["District_TC"] = first_existing(col_map["District_TC"])
            # Latitude / Longitude as floats or null
            lat_val = None
            lon_val = None
            for c in col_map["Latitude"]:
                if c in df.columns:
                    lat_val = to_float_or_none(row.get(c))
                    break
            for c in col_map["Longitude"]:
                if c in df.columns:
                    lon_val = to_float_or_none(row.get(c))
                    break
            out["Latitude"] = lat_val
            out["Longitude"] = lon_val
            # Keyword fields
            out["Keyword_EN"] = en_matches
            out["Keyword_TC"] = cn_matches
            matched.append(out)

    # Write JSON (preserve Unicode)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(matched, f, ensure_ascii=False, indent=2)

    return len(df), len(matched), output_path

if __name__ == "__main__":
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    if not input_path.exists():
        print(f"Error: input file not found: {input_path}")
        sys.exit(1)
    total_rows, matched_rows, out_file = filter_and_select(input_path, output_path, args.min_matches)
    print(f"Input rows: {total_rows}")
    print(f"Matched rows: {matched_rows}")
    print(f"Output written to: {out_file.resolve()}")