from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from datetime import datetime
import pandas as pd
import shutil

app = FastAPI(title="Nakuru HPT Monitoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = BASE_DIR / "uploads"

FACILITY_FILE = DATA_DIR / "facility_master.xlsx"
HPT_FILE = DATA_DIR / "hpt_records.xlsx"

REQUIRED_HPT_PERCENT = 40
REQUIRED_CHP_KIT_PERCENT_OF_HPT = 5


def clean_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = (
        df.columns.astype(str)
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
        .str.replace("-", "_")
    )
    return df


def load_facilities() -> pd.DataFrame:
    df = pd.read_excel(FACILITY_FILE)
    df = clean_columns(df)

    rename_map = {
        "facility_na": "facility_name",
        "facility_name": "facility_name",
        "ward_nam": "ward_name",
        "ward_name": "ward_name",
        "county_na": "county_name",
        "county_name": "county_name",
        "sub_count": "subcounty_name",
        "sub_county": "subcounty_name",
        "sub_county_name": "subcounty_name",
        "subcounty": "subcounty_name",
        "subcounty_name": "subcounty_name",
    }

    df = df.rename(columns=rename_map)

    if "facility_ownership_name" in df.columns:
        df = df[
            df["facility_ownership_name"]
            .astype(str)
            .str.upper()
            .isin(["PUBLIC", "FBO"])
        ]

    needed = [
        "mfl_code",
        "facility_id",
        "facility_name",
        "ward_name",
        "subcounty_name",
        "county_name",
        "keph_level",
        "facility_ownership_name",
    ]

    for col in needed:
        if col not in df.columns:
            df[col] = ""

    df["mfl_code"] = df["mfl_code"].astype(str).str.strip()

    return df[needed]


def load_hpt_records() -> pd.DataFrame:
    df = pd.read_excel(HPT_FILE)
    df = clean_columns(df)

    needed = [
        "mfl_code",
        "amount_received",
        "funding_source",
        "procurement_source",
        "date_received",
        "amount_allocated_to_hpt",
        "amount_spent_on_hpt",
        "amount_used_for_chp_kits",
        "supporting_document",
        "submitted_by",
        "submission_date",
        "reporting_period",
    ]

    for col in needed:
        if col not in df.columns:
            df[col] = ""

    df["mfl_code"] = df["mfl_code"].astype(str).str.strip()

    money_cols = [
        "amount_received",
        "amount_allocated_to_hpt",
        "amount_spent_on_hpt",
        "amount_used_for_chp_kits",
    ]

    for col in money_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df["balance"] = df["amount_allocated_to_hpt"] - df["amount_spent_on_hpt"]

    df["hpt_percent"] = df.apply(
        lambda row: round(
            (row["amount_allocated_to_hpt"] / row["amount_received"]) * 100,
            2,
        )
        if row["amount_received"] > 0
        else 0,
        axis=1,
    )

    df["required_hpt_percent"] = REQUIRED_HPT_PERCENT

    df["compliance_status"] = df["hpt_percent"].apply(
        lambda x: "Compliant" if x >= REQUIRED_HPT_PERCENT else "Non-Compliant"
    )

    df["required_chp_kits_amount"] = df["amount_allocated_to_hpt"] * 0.05

    df["chp_kits_percent_of_hpt"] = df.apply(
        lambda row: round(
            (row["amount_used_for_chp_kits"] / row["amount_allocated_to_hpt"]) * 100,
            2,
        )
        if row["amount_allocated_to_hpt"] > 0
        else 0,
        axis=1,
    )

    df["required_chp_kits_percent_of_hpt"] = REQUIRED_CHP_KIT_PERCENT_OF_HPT

    df["chp_kits_status"] = df.apply(
        lambda row: (
            "Compliant"
            if row["amount_used_for_chp_kits"] >= row["required_chp_kits_amount"]
            else "Below Target"
        ),
        axis=1,
    )
    df["reporting_period_sort"] = pd.to_datetime(
        df["reporting_period"], errors="coerce"
    )
    return df



def get_joined_data() -> pd.DataFrame:
    facilities = load_facilities()
    records = load_hpt_records()

    df = records.merge(facilities, on="mfl_code", how="inner")
    return df


@app.get("/")
def home():
    return {"message": "Nakuru HPT Monitoring API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/facilities")
def facilities():
    df = load_facilities()
    df = df.astype(object)
    return df.fillna("").to_dict(orient="records")


@app.get("/records")
def records():
    df = get_joined_data()
    df = df.astype(object)
    return df.fillna("").to_dict(orient="records")


@app.get("/dashboard/county")
def county_dashboard(reporting_periods: str = "All",subcounty: str = "All", funding_sources: str = "All",):
    df = get_joined_data()

    if reporting_periods != "All":
        selected_periods = reporting_periods.split(",")
        df = df[df["reporting_period"].isin(selected_periods)]

    if subcounty != "All":
        selected_subcounties = subcounty.split(",")
        df = df[df["subcounty_name"].isin(selected_subcounties)]
    if funding_sources != "All":
        selected_funding_sources = funding_sources.split(",")
        df = df[df["funding_source"].isin(selected_funding_sources)]
    df["reporting_month"] = df["reporting_period"]
    total_received = df["amount_received"].sum()
    total_hpt_allocated = df["amount_allocated_to_hpt"].sum()
    total_hpt_spent = df["amount_spent_on_hpt"].sum()
    total_balance = total_hpt_allocated - total_hpt_spent

    total_chp_kits_used = df["amount_used_for_chp_kits"].sum()
    required_chp_kits_amount = df["required_chp_kits_amount"].sum()

    hpt_percent = (
        round((total_hpt_allocated / total_received) * 100, 2)
        if total_received > 0
        else 0
    )

    chp_kits_percent_of_hpt = (
        round((total_chp_kits_used / total_hpt_allocated) * 100, 2)
        if total_hpt_allocated > 0
        else 0
    )

    total_facilities = df["mfl_code"].nunique()
    compliant = df[df["compliance_status"] == "Compliant"]["mfl_code"].nunique()
    non_compliant = df[df["compliance_status"] == "Non-Compliant"][
        "mfl_code"
    ].nunique()

    chp_compliant = df[df["chp_kits_status"] == "Compliant"]["mfl_code"].nunique()
    chp_below_target = df[df["chp_kits_status"] == "Below Target"][
        "mfl_code"
    ].nunique()

    summary = {
        "total_amount_received": float(total_received),
        "total_hpt_allocated": float(total_hpt_allocated),
        "total_hpt_spent": float(total_hpt_spent),
        "total_balance": float(total_balance),
        "average_hpt_percent": float(hpt_percent),
        "required_hpt_percent": int(REQUIRED_HPT_PERCENT),
        "total_facilities_submitted": int(total_facilities),
        "compliant_facilities": int(compliant),
        "non_compliant_facilities": int(non_compliant),
        "total_chp_kits_used": float(total_chp_kits_used),
        "required_chp_kits_amount": float(required_chp_kits_amount),
        "chp_kits_percent_of_hpt": float(chp_kits_percent_of_hpt),
        "required_chp_kits_percent_of_hpt": int(REQUIRED_CHP_KIT_PERCENT_OF_HPT),
        "chp_kits_compliant_facilities": int(chp_compliant),
        "chp_kits_below_target_facilities": int(chp_below_target),
    }

    facility_compliance = (
        df.groupby(
            ["mfl_code", "facility_name", "subcounty_name", "ward_name"],
            dropna=False,
        )
        .agg(
            amount_received=("amount_received", "sum"),
            hpt_allocated=("amount_allocated_to_hpt", "sum"),
            hpt_spent=("amount_spent_on_hpt", "sum"),
            amount_used_for_chp_kits=("amount_used_for_chp_kits", "sum"),
            reporting_period=("reporting_period", "first"),
        )
        .reset_index()
    )

    facility_compliance["balance"] = (
        facility_compliance["hpt_allocated"] - facility_compliance["hpt_spent"]
    )

    facility_compliance["hpt_percent"] = facility_compliance.apply(
        lambda row: round((row["hpt_allocated"] / row["amount_received"]) * 100, 2)
        if row["amount_received"] > 0
        else 0,
        axis=1,
    )

    facility_compliance["required_hpt_percent"] = REQUIRED_HPT_PERCENT

    facility_compliance["compliance_status"] = facility_compliance["hpt_percent"].apply(
        lambda x: "Compliant" if x >= REQUIRED_HPT_PERCENT else "Non-Compliant"
    )

    facility_compliance["required_chp_kits_amount"] = (
        facility_compliance["hpt_allocated"] * 0.05
    )

    facility_compliance["chp_kits_percent_of_hpt"] = facility_compliance.apply(
        lambda row: round(
            (row["amount_used_for_chp_kits"] / row["hpt_allocated"]) * 100,
            2,
        )
        if row["hpt_allocated"] > 0
        else 0,
        axis=1,
    )

    facility_compliance["required_chp_kits_percent_of_hpt"] = (
        REQUIRED_CHP_KIT_PERCENT_OF_HPT
    )

    facility_compliance["chp_kits_status"] = facility_compliance.apply(
        lambda row: (
            "Compliant"
            if row["amount_used_for_chp_kits"] >= row["required_chp_kits_amount"]
            else "Below Target"
        ),
        axis=1,
    )
    
    facility_compliance = facility_compliance.astype(object)
    funding_source_trend = (
    df.groupby(
        ["reporting_period_sort", "reporting_period", "funding_source"],
        dropna=False,
    )
    .agg(amount_received=("amount_received", "sum"))
    .reset_index()
    .sort_values("reporting_period_sort")
)

    hpt_allocation_trend = (
    df.groupby(
        ["reporting_period_sort", "reporting_period"],
        dropna=False,
    )
    .agg(
        amount_received=("amount_received", "sum"),
        hpt_allocated=("amount_allocated_to_hpt", "sum"),
        hpt_spent=("amount_spent_on_hpt", "sum"),
        chp_kits_used=("amount_used_for_chp_kits", "sum"),
    )
    .reset_index()
    .sort_values("reporting_period_sort")
)
    return {
        "summary": summary,
        "facility_compliance": facility_compliance.fillna("").to_dict(
            orient="records"
        ),
        "funding_source_trend": funding_source_trend.fillna("").to_dict(orient="records"),
        "hpt_allocation_trend": hpt_allocation_trend.fillna("").to_dict(orient="records"),
    }
    


@app.get("/dashboard/facility/{mfl_code}")
def facility_dashboard(mfl_code: str):
    df = get_joined_data()
    df = df[df["mfl_code"].astype(str) == str(mfl_code)]

    if df.empty:
        return {"message": "No records found for this facility", "records": []}

    total_received = df["amount_received"].sum()
    total_hpt_allocated = df["amount_allocated_to_hpt"].sum()
    total_hpt_spent = df["amount_spent_on_hpt"].sum()
    total_chp_kits_used = df["amount_used_for_chp_kits"].sum()

    balance = total_hpt_allocated - total_hpt_spent

    hpt_percent = (
        round((total_hpt_allocated / total_received) * 100, 2)
        if total_received > 0
        else 0
    )

    chp_kits_percent_of_hpt = (
        round((total_chp_kits_used / total_hpt_allocated) * 100, 2)
        if total_hpt_allocated > 0
        else 0
    )

    return {
        "summary": {
            "facility_name": df["facility_name"].iloc[0],
            "subcounty_name": df["subcounty_name"].iloc[0],
            "ward_name": df["ward_name"].iloc[0],
            "amount_received": float(total_received),
            "hpt_allocated": float(total_hpt_allocated),
            "hpt_spent": float(total_hpt_spent),
            "balance": float(balance),
            "hpt_percent": float(hpt_percent),
            "required_hpt_percent": int(REQUIRED_HPT_PERCENT),
            "compliance_status": "Compliant"
            if hpt_percent >= REQUIRED_HPT_PERCENT
            else "Non-Compliant",
            "amount_used_for_chp_kits": float(total_chp_kits_used),
            "chp_kits_percent_of_hpt": float(chp_kits_percent_of_hpt),
            "required_chp_kits_percent_of_hpt": int(
                REQUIRED_CHP_KIT_PERCENT_OF_HPT
            ),
        },
        "records": df.astype(object).fillna("").to_dict(orient="records"),
    }


@app.post("/submit-record")
async def submit_record(
    mfl_code: str = Form(...),
    amount_received: float = Form(...),
    funding_source: str = Form(...),
    reporting_period: str = Form(""),
    procurement_source: str = Form(""),
    date_received: str = Form(...),
    amount_allocated_to_hpt: float = Form(...),
    amount_spent_on_hpt: float = Form(...),
    amount_used_for_chp_kits: float = Form(0),
    submitted_by: str = Form("facility_user"),
    supporting_document: UploadFile | None = File(None),
):
    UPLOAD_DIR.mkdir(exist_ok=True)

    document_name = ""

    if supporting_document:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        document_name = f"{timestamp}_{supporting_document.filename}"
        file_path = UPLOAD_DIR / document_name

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(supporting_document.file, buffer)

    old_df = pd.read_excel(HPT_FILE)
    old_df = clean_columns(old_df)

    new_record = {
        "mfl_code": mfl_code,
        "amount_received": amount_received,
        "funding_source": funding_source,
         "reporting_period": reporting_period,
        "procurement_source": procurement_source,
        "date_received": date_received,
        "amount_allocated_to_hpt": amount_allocated_to_hpt,
        "amount_spent_on_hpt": amount_spent_on_hpt,
        "amount_used_for_chp_kits": amount_used_for_chp_kits,
        "supporting_document": document_name,
        "submitted_by": submitted_by,
        "submission_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
       
    }

    updated_df = pd.concat([old_df, pd.DataFrame([new_record])], ignore_index=True)
    updated_df.to_excel(HPT_FILE, index=False)

    return {
        "message": "Record submitted successfully",
        "record": new_record,
    }