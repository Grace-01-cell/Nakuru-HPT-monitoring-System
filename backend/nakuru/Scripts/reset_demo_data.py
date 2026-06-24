import pandas as pd

df = pd.read_excel("data/hpt_records.xlsx")
df = df.iloc[0:0]
df.to_excel("data/hpt_records.xlsx", index=False)

print("Demo data cleared")