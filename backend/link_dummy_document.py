from pathlib import Path

from database import SessionLocal
from models import HPTRecord, SupportingDocument


BASE_DIR = Path(__file__).resolve().parent
SAMPLE_DOCUMENT = (
    BASE_DIR
    / "uploads"
    / "sample_document.pdf"
)


def main():
    if not SAMPLE_DOCUMENT.exists():
        raise FileNotFoundError(
            "Sample PDF was not found at: "
            f"{SAMPLE_DOCUMENT}"
        )

    file_bytes = SAMPLE_DOCUMENT.read_bytes()

    if not file_bytes:
        raise ValueError(
            "sample_document.pdf is empty."
        )

    db = SessionLocal()

    try:
        # Only target records that currently have no document.
        records_without_documents = (
            db.query(HPTRecord)
            .filter(
                HPTRecord.supporting_document_id.is_(None)
            )
            .all()
        )

        if not records_without_documents:
            print(
                "No HPT records without supporting "
                "documents were found."
            )
            return

        # Reuse the existing demo document if this
        # script has already created it before.
        document = (
            db.query(SupportingDocument)
            .filter(
                SupportingDocument.original_filename
                == "sample_document.pdf",
                SupportingDocument.uploaded_by
                == "demo_import",
            )
            .order_by(
                SupportingDocument.id.desc()
            )
            .first()
        )

        if not document:
            document = SupportingDocument(
                original_filename=(
                    "sample_document.pdf"
                ),
                content_type="application/pdf",
                file_size=len(file_bytes),
                file_data=file_bytes,
                uploaded_by="demo_import",
            )

            db.add(document)
            db.flush()

        for record in records_without_documents:
            record.supporting_document_id = (
                document.id
            )

        linked_count = len(
            records_without_documents
        )

        db.commit()

        print(
            "Dummy supporting document linked "
            "successfully."
        )
        print(
            f"Document ID: {document.id}"
        )
        print(
            f"HPT records updated: {linked_count}"
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()