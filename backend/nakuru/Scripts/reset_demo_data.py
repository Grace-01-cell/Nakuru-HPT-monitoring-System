import sys
from pathlib import Path

import pandas as pd


# The script is located at:
# backend/nakuru/Scripts/reset_demo_data.py
BACKEND_DIR = Path(__file__).resolve().parents[2]

# Allow the script to import database.py and models.py
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import SessionLocal, engine
from models import (
    HPTRecord,
    SHAReport,
    SupportingDocument,
)


HPT_FILE = BACKEND_DIR / "data" / "hpt_records.xlsx"
SHA_FILE = BACKEND_DIR / "data" / "county_sha_reports.xlsx"

CONFIRMATION_TEXT = "DELETE DEMO DATA"


def get_excel_row_count(file_path: Path) -> int:
    if not file_path.exists():
        return 0

    dataframe = pd.read_excel(file_path)
    return len(dataframe)


def clear_excel_file(file_path: Path) -> int:
    if not file_path.exists():
        print(f"Excel file not found: {file_path}")
        return 0

    dataframe = pd.read_excel(file_path)
    deleted_rows = len(dataframe)

    # Preserve the existing column headings.
    empty_dataframe = dataframe.iloc[0:0]
    empty_dataframe.to_excel(file_path, index=False)

    return deleted_rows


def main():
    db = SessionLocal()

    try:
        hpt_records = db.query(HPTRecord).all()
        sha_reports = db.query(SHAReport).all()

        # Collect only documents connected to HPT or SHA records.
        document_ids = {
            record.supporting_document_id
            for record in hpt_records
            if record.supporting_document_id is not None
        }

        document_ids.update(
            report.supporting_document_id
            for report in sha_reports
            if report.supporting_document_id is not None
        )

        hpt_count = len(hpt_records)
        sha_count = len(sha_reports)
        linked_document_count = len(document_ids)

        hpt_excel_count = get_excel_row_count(HPT_FILE)
        sha_excel_count = get_excel_row_count(SHA_FILE)

        print("")
        print("=" * 55)
        print("NAKURU HPT DEMO DATA RESET")
        print("=" * 55)
        print(f"Database host: {engine.url.host}")
        print(f"Database name: {engine.url.database}")
        print("")
        print("PostgreSQL records to delete:")
        print(f"  HPT records: {hpt_count}")
        print(f"  SHA reports: {sha_count}")
        print(
            "  Linked supporting documents: "
            f"{linked_document_count}"
        )
        print("")
        print("Legacy Excel rows to clear:")
        print(f"  HPT Excel rows: {hpt_excel_count}")
        print(f"  SHA Excel rows: {sha_excel_count}")
        print("")
        print("The following will NOT be deleted:")
        print("  - User accounts")
        print("  - Admin, County and Facility users")
        print("  - Facility master data")
        print("  - Database tables")
        print("")

        confirmation = input(
            f"Type {CONFIRMATION_TEXT} to continue: "
        ).strip()

        if confirmation != CONFIRMATION_TEXT:
            print("")
            print("Reset cancelled. No data was deleted.")
            return

        # Delete HPT and SHA records first because they refer
        # to supporting documents through foreign keys.
        deleted_hpt = (
            db.query(HPTRecord)
            .delete(synchronize_session=False)
        )

        deleted_sha = (
            db.query(SHAReport)
            .delete(synchronize_session=False)
        )

        db.flush()

        deleted_documents = 0

        if document_ids:
            deleted_documents = (
                db.query(SupportingDocument)
                .filter(
                    SupportingDocument.id.in_(
                        document_ids
                    )
                )
                .delete(synchronize_session=False)
            )

        db.commit()

        print("")
        print("PostgreSQL demo data deleted successfully.")
        print(f"  HPT records deleted: {deleted_hpt}")
        print(f"  SHA reports deleted: {deleted_sha}")
        print(
            "  Supporting documents deleted: "
            f"{deleted_documents}"
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

    # Clear the old Excel copies after the database reset.
    try:
        deleted_hpt_excel = clear_excel_file(HPT_FILE)
        deleted_sha_excel = clear_excel_file(SHA_FILE)

        print("")
        print("Legacy Excel data cleared successfully.")
        print(
            f"  HPT Excel rows cleared: "
            f"{deleted_hpt_excel}"
        )
        print(
            f"  SHA Excel rows cleared: "
            f"{deleted_sha_excel}"
        )

    except PermissionError:
        print("")
        print(
            "The PostgreSQL records were deleted, but an "
            "Excel file is open and could not be cleared."
        )
        print(
            "Close the Excel files and run the script again."
        )

    print("")
    print("Demo-data reset completed.")


if __name__ == "__main__":
    main()