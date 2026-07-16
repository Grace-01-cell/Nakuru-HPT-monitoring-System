from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from datetime import datetime
import pandas as pd
import shutil
from sqlalchemy.orm import Session
from fastapi import Depends
from database import Base, engine, get_db
from models import SupportingDocument, User
from auth import router as auth_router
from fastapi.staticfiles import StaticFiles
# Create any database tables that do not already exist.
Base.metadata.create_all(bind=engine)

class ReviewRecordRequest(BaseModel):
    record_id: int | str | None = None
    mfl_code: str
    reporting_period: str
    review_status: Literal["Accepted", "Rejected"]
    review_reason: str = ""
    reviewed_by: str = "county_reviewer"
    
app = FastAPI(title="Nakuru HPT - Financial Monitoring System API")

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = BASE_DIR / "uploads"

FACILITY_FILE = DATA_DIR / "facility_master.xlsx"
HPT_FILE = DATA_DIR / "hpt_records.xlsx"
SHA_FILE = DATA_DIR / "county_sha_reports.xlsx"
SHA_UPLOAD_DIR = UPLOAD_DIR / "sha_reports"
SHA_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

UPLOAD_DIR.mkdir(exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://nakuru-hpt-dashboard-cdu36.ondigitalocean.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

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

        # County review fields
        "review_status",
        "review_reason",
        "reviewed_by",
        "reviewed_at",
    ]

    for col in needed:
        if col not in df.columns:
            df[col] = ""

    df["mfl_code"] = (
        df["mfl_code"]
        .astype(str)
        .str.strip()
    )

    money_cols = [
        "amount_received",
        "amount_allocated_to_hpt",
        "amount_spent_on_hpt",
        "amount_used_for_chp_kits",
    ]

    for col in money_cols:
        df[col] = pd.to_numeric(
            df[col],
            errors="coerce",
        ).fillna(0)

    # Clean review fields for old and new records
    review_text_columns = [
        "review_status",
        "review_reason",
        "reviewed_by",
        "reviewed_at",
    ]

    for col in review_text_columns:
        df[col] = (
            df[col]
            .fillna("")
            .astype(str)
            .str.strip()
        )

    # Existing records that have never been reviewed become Pending
    df.loc[
        df["review_status"] == "",
        "review_status",
    ] = "Pending"

    df["balance"] = (
        df["amount_allocated_to_hpt"]
        - df["amount_spent_on_hpt"]
    )

    df["hpt_percent"] = df.apply(
        lambda row: round(
            (
                row["amount_allocated_to_hpt"]
                / row["amount_received"]
            )
            * 100,
            2,
        )
        if row["amount_received"] > 0
        else 0,
        axis=1,
    )

    df["required_hpt_percent"] = REQUIRED_HPT_PERCENT

    df["compliance_status"] = df["hpt_percent"].apply(
        lambda value: (
            "Compliant"
            if value >= REQUIRED_HPT_PERCENT
            else "Non-Compliant"
        )
    )

    # CHP calculations remain available in the backend,
    # although the CHP columns will no longer appear in the table.
    df["required_chp_kits_amount"] = (
        df["amount_allocated_to_hpt"] * 0.05
    )

    df["chp_kits_percent_of_hpt"] = df.apply(
        lambda row: round(
            (
                row["amount_used_for_chp_kits"]
                / row["amount_allocated_to_hpt"]
            )
            * 100,
            2,
        )
        if row["amount_allocated_to_hpt"] > 0
        else 0,
        axis=1,
    )

    df["required_chp_kits_percent_of_hpt"] = (
        REQUIRED_CHP_KIT_PERCENT_OF_HPT
    )

    df["chp_kits_status"] = df.apply(
        lambda row: (
            "Compliant"
            if row["amount_used_for_chp_kits"]
            >= row["required_chp_kits_amount"]
            else "Below Target"
        ),
        axis=1,
    )

    df["reporting_period_sort"] = pd.to_datetime(
        df["reporting_period"],
        errors="coerce",
    )

    return df
def normalize_mfl_code(value) -> str:
    if pd.isna(value):
        return ""

    text = str(value).strip()

    if text.lower() in {"", "nan", "none"}:
        return ""

    if text.endswith(".0"):
        text = text[:-2]

    return text


def get_joined_data() -> pd.DataFrame:
    facilities = load_facilities().copy()
    records = load_hpt_records().copy()

    facilities["mfl_code"] = facilities["mfl_code"].apply(
        normalize_mfl_code
    )

    records["mfl_code"] = records["mfl_code"].apply(
        normalize_mfl_code
    )

    # Exclude rows without valid MFL codes.
    facilities = facilities[
        facilities["mfl_code"] != ""
    ].copy()

    records = records[
        records["mfl_code"] != ""
    ].copy()

    # One valid MFL code must belong to only one facility.
    duplicate_facilities = facilities[
        facilities.duplicated(
            subset=["mfl_code"],
            keep=False,
        )
    ]

    if not duplicate_facilities.empty:
        duplicate_codes = sorted(
            duplicate_facilities["mfl_code"]
            .astype(str)
            .unique()
            .tolist()
        )

        raise ValueError(
            "Duplicate valid MFL codes found in facility master: "
            + ", ".join(duplicate_codes)
        )

    return records.merge(
        facilities,
        on="mfl_code",
        how="inner",
        validate="many_to_one",
    )

def ensure_sha_file():
    if not SHA_FILE.exists():
        columns = [
            "report_id",
            "report_type",
            "frequency",
            "reporting_year",
            "reporting_month",
            "reporting_quarter",
            "reporting_period",
            "value",
            "submitted_by",
            "notes",
            "supporting_document",
            "submitted_at",
        ]

        pd.DataFrame(columns=columns).to_excel(SHA_FILE, index=False)

@app.get("/")
def home():
    return {"message": "Nakuru HPT Monitoring API is running"}
@app.get("/county-sha-reports")
def get_county_sha_reports():
    ensure_sha_file()

    df = pd.read_excel(SHA_FILE)
    df = clean_columns(df)
    df = df.astype(object)

    return df.fillna("").to_dict(orient="records")

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
def county_dashboard(reporting_periods: str = "All",subcounties: str = "All", funding_sources: str = "All",):
    df = get_joined_data()

    if reporting_periods != "All":
        selected_periods = reporting_periods.split(",")
        df = df[df["reporting_period"].isin(selected_periods)]

    if subcounties != "All":
        selected_subcounties = subcounties.split(",")
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
        [
            "mfl_code",
            "facility_name",
            "subcounty_name",
            "ward_name",
            "reporting_period",
            "funding_source",
        ],
        dropna=False,
    )
    .agg(
        amount_received=("amount_received", "sum"),
        hpt_allocated=("amount_allocated_to_hpt", "sum"),
        hpt_spent=("amount_spent_on_hpt", "sum"),
        amount_used_for_chp_kits=("amount_used_for_chp_kits", "sum"),
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
    
    if "funding_source" in df.columns:
        facility_compliance["funding_source"] = df["funding_source"]
    else:
        facility_compliance["funding_source"] = ""

    
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
@app.post("/county-sha-reports")
async def submit_county_sha_report(
    report_type: str = Form(...),
    reporting_year: str = Form(...),
    reporting_month: str = Form(""),
    reporting_quarter: str = Form(""),
    value: float = Form(0),
    submitted_by: str = Form("SHA Coordinator"),
    notes: str = Form(""),
    supporting_document: UploadFile | None = File(None),
):
    ensure_sha_file()

    frequency = "Quarterly" if report_type == "SHA Contracted Facilities" else "Monthly"

    reporting_period = (
        f"{reporting_quarter}-{reporting_year}"
        if frequency == "Quarterly"
        else f"{reporting_month}-{reporting_year}"
    )

    document_path = ""

    if supporting_document:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        document_name = f"{timestamp}_{supporting_document.filename}"
        file_path = SHA_UPLOAD_DIR / document_name

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(supporting_document.file, buffer)

        document_path = f"/uploads/sha_reports/{document_name}"

    df = pd.read_excel(SHA_FILE)
    df = clean_columns(df)

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
    "supporting_document": (
        f"/uploads/{document_name}"
        if document_name
        else ""
    ),
    "submitted_by": submitted_by,
    "submission_date": datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    ),

    # Every new submission starts as Pending
    "review_status": "Pending",
    "review_reason": "",
    "reviewed_by": "",
    "reviewed_at": "",
}
    updated_df = pd.concat([df, pd.DataFrame([new_record])], ignore_index=True)
    updated_df.to_excel(SHA_FILE, index=False)

    return {
        "success": True,
        "message": "SHA report submitted successfully",
        "record": new_record,
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
        "supporting_document": f"/uploads/{document_name}" if document_name else "",
        "submitted_by": submitted_by,
        "submission_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
       
    }

    updated_df = pd.concat([old_df, pd.DataFrame([new_record])], ignore_index=True)
    updated_df.to_excel(HPT_FILE, index=False)

    return {
        "message": "Record submitted successfully",
        "record": new_record,
    }
@app.patch("/records/review")
def review_submission(payload: ReviewRecordRequest):
    review_reason = payload.review_reason.strip()

    if (
        payload.review_status == "Rejected"
        and not review_reason
    ):
        raise HTTPException(
            status_code=400,
            detail="A rejection reason is required.",
        )

    try:
        df = pd.read_excel(HPT_FILE)
        df = clean_columns(df)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="The HPT records file was not found.",
        )

    review_columns = [
        "review_status",
        "review_reason",
        "reviewed_by",
        "reviewed_at",
    ]

    for col in review_columns:
        if col not in df.columns:
            df[col] = ""

    if "mfl_code" not in df.columns:
        raise HTTPException(
            status_code=500,
            detail="The HPT records file has no MFL code column.",
        )

    if "reporting_period" not in df.columns:
        raise HTTPException(
            status_code=500,
            detail="The HPT records file has no reporting period column.",
        )

    def normalise_mfl(value) -> str:
        text = str(value).strip()

        # Excel sometimes reads codes such as 14275 as 14275.0
        if text.endswith(".0"):
            text = text[:-2]

        return text

    requested_mfl = normalise_mfl(payload.mfl_code)
    requested_period = str(
        payload.reporting_period
    ).strip()

    mfl_values = df["mfl_code"].apply(normalise_mfl)

    reporting_period_values = (
        df["reporting_period"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    mask = (
        (mfl_values == requested_mfl)
        & (
            reporting_period_values
            == requested_period
        )
    )

    matching_indexes = df.index[mask].tolist()

    if not matching_indexes:
        raise HTTPException(
            status_code=404,
            detail=(
                "The submission could not be found for "
                f"MFL {payload.mfl_code} and reporting period "
                f"{payload.reporting_period}."
            ),
        )

    # Where duplicates exist, update the latest matching record.
    target_index = matching_indexes[-1]

    reviewed_at = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    saved_reason = (
        review_reason
        if payload.review_status == "Rejected"
        else ""
    )

    df.at[
        target_index,
        "review_status",
    ] = payload.review_status

    df.at[
        target_index,
        "review_reason",
    ] = saved_reason

    df.at[
        target_index,
        "reviewed_by",
    ] = payload.reviewed_by.strip() or "county_reviewer"

    df.at[
        target_index,
        "reviewed_at",
    ] = reviewed_at

    try:
        df.to_excel(HPT_FILE, index=False)
    except PermissionError:
        raise HTTPException(
            status_code=409,
            detail=(
                "The HPT Excel file is open. Close the file "
                "and try again."
            ),
        )

    return {
        "success": True,
        "message": (
            f"Submission {payload.review_status.lower()} successfully."
        ),
        "review_status": payload.review_status,
        "review_reason": saved_reason,
        "reviewed_by": (
            payload.reviewed_by.strip()
            or "county_reviewer"
        ),
        "reviewed_at": reviewed_at,
        "record": {
            "mfl_code": payload.mfl_code,
            "reporting_period": payload.reporting_period,
            "review_status": payload.review_status,
            "review_reason": saved_reason,
            "reviewed_by": (
                payload.reviewed_by.strip()
                or "county_reviewer"
            ),
            "reviewed_at": reviewed_at,
        },
    }
@app.post("/records/replace-document")
def replace_supporting_document(
    mfl_code: str = Form(...),
    reporting_period: str = Form(...),
    supporting_document: UploadFile = File(...),
):
    df = pd.read_excel(HPT_FILE)
    df = clean_columns(df)

    if "supporting_document" not in df.columns:
        df["supporting_document"] = ""

    mask = (
        (df["mfl_code"].astype(str) == str(mfl_code))
        & (df["reporting_period"].astype(str) == str(reporting_period))
    )

    if not mask.any():
        return {
            "success": False,
            "message": "Submission record not found.",
        }

    if supporting_document.content_type != "application/pdf":
        return {
            "success": False,
            "message": "Only PDF files are allowed.",
        }

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    document_name = f"{timestamp}_{supporting_document.filename}"
    file_path = UPLOAD_DIR / document_name

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(supporting_document.file, buffer)

    df.loc[mask, "supporting_document"] = f"/uploads/{document_name}"

    df.to_excel(HPT_FILE, index=False)

    return {
        "success": True,
        "message": "Supporting document replaced successfully.",
        "supporting_document": f"/uploads/{document_name}",
    }