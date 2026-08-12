from __future__ import annotations

import hashlib
import json
import math
import re
import sys
from pathlib import Path

import pandas as pd


def wilson_interval(successes: int, total: int, z: float = 1.959963984540054) -> tuple[float, float]:
    if total == 0:
        return math.nan, math.nan
    proportion = successes / total
    denominator = 1 + z * z / total
    center = (proportion + z * z / (2 * total)) / denominator
    margin = z * math.sqrt(
        proportion * (1 - proportion) / total + z * z / (4 * total * total)
    ) / denominator
    return center - margin, center + margin


def main() -> None:
    if len(sys.argv) not in (2, 3):
        raise SystemExit("Usage: python summarize_faults.py <raw-json-glob> [output-stem]")

    evaluation_dir = Path(__file__).resolve().parents[1]
    raw_dir = evaluation_dir / "results" / "raw"
    processed_dir = evaluation_dir / "results" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    paths = sorted(raw_dir.glob(sys.argv[1]))
    if not paths:
        raise FileNotFoundError(f"No raw files match: {sys.argv[1]}")

    rows: list[dict[str, object]] = []
    metadata: list[dict[str, object]] = []
    for run_index, path in enumerate(paths, start=1):
        payload = json.loads(path.read_text(encoding="utf-8"))
        meta = payload["metadata"]
        metadata.append(meta)
        for record in payload["records"]:
            rows.append(
                {
                    "source_file": path.name,
                    "run_index": run_index,
                    "browser": meta["browser"],
                    "browser_version": meta["browser_version"],
                    "scenario": record["scenario"],
                    "status": record["status"],
                    "identity_set_match": record.get("identity_set_match"),
                    "public_field_match": record.get("public_field_match"),
                    "duplicate_stable_ids": record.get("duplicate_stable_ids", 0),
                    "missing_id_count": record.get("missing_id_count", 0),
                    "unexpected_id_count": record.get("unexpected_id_count", 0),
                    "public_field_mismatch_count": record.get(
                        "public_field_mismatch_count", 0
                    ),
                    "protocol_completion_latency_ms": record.get(
                        "protocol_completion_latency_ms"
                    ),
                }
            )

    data = pd.DataFrame(rows)

    def summarize(group: pd.DataFrame) -> pd.Series:
        passes = int((group["status"] == "pass").sum())
        runs = int(len(group))
        ci_low, ci_high = wilson_interval(passes, runs)
        latency = group["protocol_completion_latency_ms"].dropna()
        identity = group["identity_set_match"].dropna()
        fields = group["public_field_match"].dropna()
        return pd.Series(
            {
                "runs": runs,
                "passes": passes,
                "success_rate": passes / runs,
                "wilson_95_low": ci_low,
                "wilson_95_high": ci_high,
                "exact_identity_rate": float(identity.astype(bool).mean()),
                "exact_public_field_rate": float(fields.astype(bool).mean()),
                "duplicate_stable_ids": int(group["duplicate_stable_ids"].sum()),
                "missing_ids": int(group["missing_id_count"].sum()),
                "unexpected_ids": int(group["unexpected_id_count"].sum()),
                "public_field_mismatches": int(
                    group["public_field_mismatch_count"].sum()
                ),
                "latency_median_ms": float(latency.median()),
                "latency_p95_ms": float(latency.quantile(0.95)),
            }
        )

    summary = (
        data.groupby(["browser", "scenario"], sort=True)
        .apply(summarize, include_groups=False)
        .reset_index()
    )
    stem = sys.argv[2] if len(sys.argv) == 3 else "live_sync_fault_production_formal"
    if not re.fullmatch(r"[A-Za-z0-9._-]+", stem):
        raise ValueError(f"Unsafe output stem: {stem}")
    summary_csv = processed_dir / f"{stem}_summary.csv"
    summary_json = processed_dir / f"{stem}_summary.json"
    summary.to_csv(summary_csv, index=False, float_format="%.6f")

    source_hashes = sorted({str(item["evaluated_source_sha256"]) for item in metadata})
    next_hashes = sorted({str(item["next_build_id_sha256"]) for item in metadata})
    lottery_hashes = sorted({str(item["lottery_dist_index_sha256"]) for item in metadata})
    versions = {
        browser: sorted(group["browser_version"].unique().tolist())
        for browser, group in data.groupby("browser", sort=True)
    }
    audit = {
        "source_glob": sys.argv[1],
        "source_file_count": len(paths),
        "record_count": len(data),
        "pass_count": int((data["status"] == "pass").sum()),
        "all_pass": bool((data["status"] == "pass").all()),
        "all_exact_identity": bool(data["identity_set_match"].fillna(False).all()),
        "all_exact_public_fields": bool(data["public_field_match"].fillna(False).all()),
        "duplicate_stable_ids": int(data["duplicate_stable_ids"].sum()),
        "missing_ids": int(data["missing_id_count"].sum()),
        "unexpected_ids": int(data["unexpected_id_count"].sum()),
        "public_field_mismatches": int(data["public_field_mismatch_count"].sum()),
        "evaluated_source_sha256_values": source_hashes,
        "next_build_id_sha256_values": next_hashes,
        "lottery_dist_index_sha256_values": lottery_hashes,
        "browser_versions": versions,
        "consistent_source_and_build_fingerprints": (
            len(source_hashes) == len(next_hashes) == len(lottery_hashes) == 1
        ),
        "summary_script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "groups": summary.to_dict(orient="records"),
    }
    summary_json.write_text(
        json.dumps(audit, ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({key: value for key, value in audit.items() if key != "groups"}, indent=2))
    print(f"Summary CSV: {summary_csv}")
    print(f"Summary JSON: {summary_json}")


if __name__ == "__main__":
    main()
