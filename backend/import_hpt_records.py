from datetime import datetime
from pathlib import Path

import pandas as pd

from database import Base, SessionLocal, engine
from models import HPTRecord


BASE_DIR = Path(__file__).resolve().parent
HPT_FILE = BASE_DIR / "data" / "hpt_records.xlsx"


def clean_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = (
        df.columns.astype(str)
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
        .str.replace("-", "_")
    )

    return df


def clean_text(value, default: str = "") -> str:
    if value is None or pd.isna(value):
        return default

    text = str(value).strip()

    if text.lower() in {"", "nan", "none"}:
        return default

    return text


def normalize_mfl_code(value) -> str:
    text = clean_text(value)

    if text.endswith(".0"):
        text = text[:-2]

    return text


def clean_number(value) -> float:
    number = pd.to_numeric(
        value,
        errors="coerce",
    )

    if pd.isna(number):
        return 0.0

    return float(number)


def parse_datetime(value):
    text = clean_text(value)

    if not text:
        return None

    parsed = pd.to_datetime(
        text,
        errors="coerce",
    )

    if pd.isna(parsed):
        return None

    return parsed.to_pydatetime()


def main():
    if not HPT_FILE.exists():
        raise FileNotFoundError(
            f"HPT records file not found: {HPT_FILE}"
        )

    # Create the table if it does not already exist.
    Base.metadata.create_all(bind=engine)

    df = pd.read_excel(HPT_FILE)
    df = clean_columns(df)

    db = SessionLocal()

    imported = 0
    skipped = 0
    invalid = 0

    try:
        existing_keys = {
            (
                normalize_mfl_code(mfl_code),
                clean_text(reporting_period),
            )
            for mfl_code, reporting_period in (
                db.query(
                    HPTRecord.mfl_code,
                    HPTRecord.reporting_period,
                ).all()
            )
        }

        for _, row in df.iterrows():
            mfl_code = normalize_mfl_code(
                row.get("mfl_code")
            )

            reporting_period = clean_text(
                row.get("reporting_period")
            )

            if not mfl_code or not reporting_period:
                invalid += 1
                continue

            record_key = (
                mfl_code,
                reporting_period,
            )

            if record_key in existing_keys:
                skipped += 1
                continue

            submission_date = parse_datetime(
                row.get("submission_date")
            )

            reviewed_at = parse_datetime(
                row.get("reviewed_at")
            )

            review_status = clean_text(
                row.get("review_status"),
                "Pending",
            )

            record = HPTRecord(
                mfl_code=mfl_code,
                reporting_period=reporting_period,
                amount_received=clean_number(
                    row.get("amount_received")
                ),
                funding_source=clean_text(
                    row.get("funding_source")
                ),
                procurement_source=clean_text(
                    row.get("procurement_source")
                ),
                date_received=clean_text(
                    row.get("date_received")
                ),
                amount_allocated_to_hpt=clean_number(
                    row.get("amount_allocated_to_hpt")
                ),
                amount_spent_on_hpt=clean_number(
                    row.get("amount_spent_on_hpt")
                ),
                amount_used_for_chp_kits=clean_number(
                    row.get("amount_used_for_chp_kits")
                ),

                # Old /uploads paths cannot become database
                # document IDs automatically.
                supporting_document_id=None,

                submitted_by=clean_text(
                    row.get("submitted_by")
                ),
                submitter_phone=clean_text(
                    row.get("submitter_phone")
                ),
                submission_date=(
                    submission_date or datetime.now()
                ),
                review_status=(
                    review_status or "Pending"
                ),
                review_reason=clean_text(
                    row.get("review_reason")
                ),
                reviewed_by=clean_text(
                    row.get("reviewed_by")
                ),
                reviewed_at=reviewed_at,
            )

            db.add(record)

            existing_keys.add(record_key)
            imported += 1

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

    print("HPT Excel-to-PostgreSQL import complete.")
    print(f"Imported: {imported}")
    print(f"Skipped existing records: {skipped}")
    print(f"Skipped invalid records: {invalid}")


if __name__ == "__main__":
    main()