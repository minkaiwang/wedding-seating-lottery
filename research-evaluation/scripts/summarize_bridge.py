from __future__ import annotations

import json
import hashlib
import math
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
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


def summarize(group: pd.DataFrame) -> pd.Series:
    successes = int((group["status"] == "pass").sum())
    total = int(len(group))
    ci_low, ci_high = wilson_interval(successes, total)
    latency = group["protocol_completion_latency_ms"].dropna()
    attempted = group.loc[group["protocol_completion_latency_ms"].notna()]
    protocol_successes = int((attempted["status"] == "pass").sum())
    protocol_ci_low, protocol_ci_high = wilson_interval(protocol_successes, len(attempted))
    preparation = group.get("receiver_preparation_ms", pd.Series(dtype=float)).dropna()
    persistence = group.get("receiver_persistence_ms", pd.Series(dtype=float)).dropna()
    wall = group["observed_wall_time_ms"].dropna()
    return pd.Series(
        {
            "end_to_end_runs": total,
            "end_to_end_passes": successes,
            "end_to_end_success_rate": successes / total if total else math.nan,
            "end_to_end_wilson_95_low": ci_low,
            "end_to_end_wilson_95_high": ci_high,
            "protocol_attempts_completed": int(len(attempted)),
            "protocol_correct_completions": protocol_successes,
            "protocol_correct_completion_rate": protocol_successes / len(attempted) if len(attempted) else math.nan,
            "protocol_wilson_95_low": protocol_ci_low,
            "protocol_wilson_95_high": protocol_ci_high,
            "precompletion_failures": total - int(len(attempted)),
            "identity_set_success_rate_among_completions": float(attempted["exact_identity_set"].fillna(False).mean()) if len(attempted) else math.nan,
            "public_field_success_rate_among_completions": float(attempted["exact_public_fields"].fillna(False).mean()) if len(attempted) else math.nan,
            "duplicate_stable_ids_total": int(group["duplicate_stable_ids"].fillna(0).sum()),
            "public_field_mismatches_total": int(group["public_field_mismatch_count"].fillna(0).sum()),
            "protocol_latency_median_ms": float(latency.median()),
            "protocol_latency_q1_ms": float(latency.quantile(0.25)),
            "protocol_latency_q3_ms": float(latency.quantile(0.75)),
            "protocol_latency_p95_ms": float(latency.quantile(0.95)),
            "protocol_latency_max_ms": float(latency.max()),
            "receiver_preparation_median_ms": float(preparation.median()) if len(preparation) else math.nan,
            "receiver_persistence_median_ms": float(persistence.median()) if len(persistence) else math.nan,
            "wall_time_median_ms": float(wall.median()),
            "wall_time_q1_ms": float(wall.quantile(0.25)),
            "wall_time_q3_ms": float(wall.quantile(0.75)),
            "wall_time_p95_ms": float(wall.quantile(0.95)),
            "wall_time_max_ms": float(wall.max()),
        }
    )


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python summarize_bridge.py <bridge-run.csv>")

    source = Path(sys.argv[1]).resolve()
    evaluation_dir = Path(__file__).resolve().parents[1]
    processed_dir = evaluation_dir / "results" / "processed"
    figure_dir = evaluation_dir / "results" / "figures"
    processed_dir.mkdir(parents=True, exist_ok=True)
    figure_dir.mkdir(parents=True, exist_ok=True)

    data = pd.read_csv(source)
    required = {
        "browser",
        "roster_size",
        "status",
        "exact_identity_set",
        "exact_public_fields",
        "duplicate_stable_ids",
        "public_field_mismatch_count",
        "protocol_completion_latency_ms",
        "observed_wall_time_ms",
    }
    missing = required.difference(data.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    if "phase" in data.columns:
        measurement = data.loc[data["phase"].fillna("measurement") == "measurement"].copy()
        warmup = data.loc[data["phase"].fillna("measurement") == "warmup"].copy()
    else:
        measurement = data.copy()
        warmup = data.iloc[0:0].copy()
    if measurement.empty:
        raise ValueError("No measurement records found")

    summary = (
        measurement.groupby(["browser", "roster_size"], sort=True, dropna=False)
        .apply(summarize, include_groups=False)
        .reset_index()
    )
    stem = source.stem
    summary_csv = processed_dir / f"{stem}_summary.csv"
    summary_json = processed_dir / f"{stem}_summary.json"
    summary.to_csv(summary_csv, index=False, float_format="%.6f")
    summary_json.write_text(
        json.dumps(
            {
                "source_csv": str(source),
                "summary_script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                "measurement_runs": int(len(measurement)),
                "measurement_passes": int((measurement["status"] == "pass").sum()),
                "warmup_runs": int(len(warmup)),
                "warmup_passes": int((warmup["status"] == "pass").sum()),
                "all_measurement_identity_sets_exact": bool(measurement["exact_identity_set"].fillna(False).all()),
                "all_measurement_public_fields_exact": bool(measurement["exact_public_fields"].fillna(False).all()),
                "measurement_duplicate_stable_ids_total": int(measurement["duplicate_stable_ids"].fillna(0).sum()),
                "measurement_public_field_mismatches_total": int(measurement["public_field_mismatch_count"].fillna(0).sum()),
                "nonpass_measurement_records": measurement.loc[
                    measurement["status"] != "pass"
                ].to_dict(orient="records"),
                "groups": summary.to_dict(orient="records"),
            },
            ensure_ascii=True,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    plt.rcParams.update(
        {
            "font.family": "Arial",
            "font.size": 9,
            "axes.labelsize": 9,
            "xtick.labelsize": 8,
            "ytick.labelsize": 8,
            "legend.fontsize": 8,
            "axes.linewidth": 0.8,
            "pdf.fonttype": 42,
            "ps.fonttype": 42,
        }
    )
    colors = {"chromium": "#3B6FB6", "firefox": "#D9792B", "webkit": "#4B8F69"}
    markers = {"chromium": "o", "firefox": "s", "webkit": "^"}
    fig, ax = plt.subplots(figsize=(7.09, 3.45))
    for browser, group in summary.groupby("browser", sort=True):
        group = group.sort_values("roster_size")
        y = group["protocol_latency_median_ms"]
        lower = y - group["protocol_latency_q1_ms"]
        upper = group["protocol_latency_q3_ms"] - y
        ax.errorbar(
            group["roster_size"],
            y,
            yerr=[lower, upper],
            label=browser.capitalize(),
            color=colors.get(browser, "#555555"),
            marker=markers.get(browser, "o"),
            linewidth=1.4,
            markersize=5,
            capsize=3,
        )
    ax.set_xlabel("Synthetic roster size")
    ax.set_ylabel("Completion latency (ms, log scale)")
    ax.set_yscale("log")
    ax.set_xticks(sorted(measurement["roster_size"].dropna().unique()))
    ax.grid(axis="y", color="#D9DDE3", linewidth=0.7)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, ncol=3, loc="upper left")
    fig.tight_layout(pad=0.8)
    figure_png = figure_dir / f"{stem}_latency.png"
    figure_pdf = figure_dir / f"{stem}_latency.pdf"
    fig.savefig(figure_png, dpi=300, bbox_inches="tight", facecolor="white")
    fig.savefig(figure_pdf, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    print(summary.to_string(index=False))
    print(f"Summary CSV: {summary_csv}")
    print(f"Summary JSON: {summary_json}")
    print(f"Figure PNG: {figure_png}")
    print(f"Figure PDF: {figure_pdf}")


if __name__ == "__main__":
    main()
