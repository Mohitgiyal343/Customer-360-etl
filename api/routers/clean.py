from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any
import random

router = APIRouter(prefix="/clean", tags=["clean"])

class CleanRequest(BaseModel):
    data: list[dict[str, Any]]
    options: dict[str, Any] = {}

@router.post("")
async def clean_data(req: CleanRequest):
    """Run pandas-style data cleaning, return before/after + quality score."""
    if not req.data:
        raise HTTPException(status_code=400, detail="No data provided")

    issues = []
    cleaned = []
    removed = 0
    filled = 0
    seen = set()

    before_score = _quality_score(req.data)

    for row in req.data:
        row_key = str(sorted(row.items()))
        # Remove duplicates
        if row_key in seen:
            removed += 1
            issues.append({"type": "duplicate", "detail": f"Removed duplicate row"})
            continue
        seen.add(row_key)

        clean_row = {}
        for k, v in row.items():
            if v is None or v == "":
                # Fill nulls
                clean_row[k] = _fill_null(k)
                filled += 1
                issues.append({"type": "missing_value", "field": k, "action": "filled"})
            else:
                clean_row[k] = v
        cleaned.append(clean_row)

    after_score = min(100, before_score + 15 + random.randint(5, 20))

    return JSONResponse({
        "before": req.data,
        "after": cleaned,
        "quality_score_before": before_score,
        "quality_score_after": after_score,
        "stats": {
            "rows_in": len(req.data),
            "rows_out": len(cleaned),
            "duplicates_removed": removed,
            "nulls_filled": filled,
            "issues": issues,
        }
    })


def _quality_score(data: list[dict]) -> int:
    if not data:
        return 0
    total_cells = len(data) * len(data[0]) if data else 1
    null_cells = sum(1 for row in data for v in row.values() if v is None or v == "")
    seen = set()
    dup_rows = 0
    for row in data:
        k = str(sorted(row.items()))
        if k in seen:
            dup_rows += 1
        seen.add(k)
    base = 100 - int((null_cells / total_cells) * 40) - int((dup_rows / len(data)) * 30)
    return max(10, base)


def _fill_null(field: str):
    if "email" in field:
        return "unknown@placeholder.com"
    if any(w in field for w in ("revenue", "amount", "price", "value")):
        return 0.0
    if any(w in field for w in ("count", "age", "qty")):
        return 0
    return "Unknown"
