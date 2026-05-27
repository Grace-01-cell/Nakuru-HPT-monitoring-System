import pandas as pd
import random
from pathlib import Path
from datetime import datetime, timedelta

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

FACILITY_FILE = DATA_DIR / "facility_master.xlsx"
OUTPUT_FILE = DATA_DIR / "hpt_records.xlsx"

funding_sources = ["County Allocation", "FIF", "SHA", "Partner Funding"]

df = pd.read_excel(FACILITY_FILE)

df.columns = (
    df.columns.astype(str)
    .str.strip()
    .str.lower()
    .str.replace(" ", "_")
    .str.replace("-", "_")
)
df = df[
    df["facility_ownership_name"]    .astype(str)
    .str.upper()
    .isin(["PUBLIC", "FBO"])
]
sample_facilities = df.head(30)

records = []

for i, (_, row) in enumerate(sample_facilities.iterrows()):
    amount_received = random.choice([
        500000, 750000, 1000000, 1250000, 1500000, 2000000, 2500000
    ])

    # Force a mix: first 12 compliant, remaining 18 non-compliant
    if i < 12:
        hpt_rate = random.choice([0.40, 0.42, 0.45, 0.50])
    else:
        hpt_rate = random.choice([0.10, 0.15, 0.20, 0.25, 0.30, 0.35])

    amount_allocated_to_hpt = round(amount_received * hpt_rate)
    amount_spent_on_hpt = round(amount_allocated_to_hpt * random.choice([0.45, 0.60, 0.75, 0.90]))

    # Force CHP Kits mix: first 10 meet target, rest below target
    if i < 10:
        chp_rate = random.choice([0.05, 0.06, 0.08, 0.10])
    else:
        chp_rate = random.choice([0.00, 0.01, 0.02, 0.03, 0.04])

    amount_used_for_chp_kits = round(amount_allocated_to_hpt * chp_rate)

    date_received = datetime(2026, 5, 1) + timedelta(days=random.randint(0, 28))

    records.append({
        "mfl_code": row["mfl_code"],
        "amount_received": amount_received,
        "funding_source": random.choice(funding_sources),
        "date_received": date_received.strftime("%Y-%m-%d"),
        "amount_allocated_to_hpt": amount_allocated_to_hpt,
        "amount_spent_on_hpt": amount_spent_on_hpt,
        "amount_used_for_chp_kits": amount_used_for_chp_kits,
        "supporting_document": "sample_document.pdf",
        "submitted_by": "demo_user",
    })

hpt_df = pd.DataFrame(records)
hpt_df.to_excel(OUTPUT_FILE, index=False)

print(f"Dummy HPT records created successfully: {OUTPUT_FILE}")
print("HPT compliant facilities: 12")
print("HPT non-compliant facilities: 18")
print("CHP Kits compliant facilities: 10")
print("CHP Kits below target facilities: 20")