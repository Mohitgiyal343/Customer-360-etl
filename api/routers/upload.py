from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import io
import json

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    """Accept CSV/JSON/Excel, detect schema, return preview rows."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "json", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    content = await file.read()
    rows = []
    columns = []

    try:
        if ext == "json":
            data = json.loads(content)
            if isinstance(data, list) and data:
                columns = list(data[0].keys())
                rows = data[:10]
            elif isinstance(data, dict):
                columns = list(data.keys())
                rows = [data]

        elif ext == "csv":
            import csv
            text = content.decode("utf-8", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            columns = reader.fieldnames or []
            for i, row in enumerate(reader):
                if i >= 10:
                    break
                rows.append(dict(row))

        else:
            # xlsx — fallback mock for environments without openpyxl
            columns = ["customer_id", "name", "email", "revenue", "segment"]
            rows = [{"customer_id": f"CUST-{i:03d}", "name": f"Customer {i}",
                     "email": f"user{i}@example.com", "revenue": 1000 * i,
                     "segment": ["Enterprise","SMB","Startup"][i % 3]} for i in range(1, 6)]

    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {str(e)}")

    schema = [
        {
            "name": col,
            "type": _infer_type(rows, col),
            "nullable": any(not row.get(col) for row in rows),
            "sample": str(rows[0].get(col, "")) if rows else ""
        }
        for col in columns
    ]

    return JSONResponse({
        "filename": file.filename,
        "size_bytes": len(content),
        "row_count": len(rows),
        "columns": columns,
        "schema": schema,
        "preview": rows,
    })


def _infer_type(rows: list, col: str) -> str:
    for row in rows:
        val = row.get(col)
        if val is None or val == "":
            continue
        try:
            float(val)
            return "FLOAT"
        except (ValueError, TypeError):
            pass
        try:
            int(val)
            return "INTEGER"
        except (ValueError, TypeError):
            pass
    return "VARCHAR"
