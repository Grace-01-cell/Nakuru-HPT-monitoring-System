import pandas as pd

# Reset HPT submissions
hpt_df = pd.read_excel("data/hpt_records.xlsx")
hpt_df = hpt_df.iloc[0:0]
hpt_df.to_excel("data/hpt_records.xlsx", index=False)

# Reset SHA reports
sha_df = pd.read_excel("data/county_sha_reports.xlsx")
sha_df = sha_df.iloc[0:0]
sha_df.to_excel("data/county_sha_reports.xlsx", index=False)

print("✅ Demo data cleared successfully.")