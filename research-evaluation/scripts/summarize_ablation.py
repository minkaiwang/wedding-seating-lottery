from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python summarize_ablation.py <ablation-run.csv>")

    source = Path(sys.argv[1]).resolve()
    evaluation_dir = Path(__file__).resolve().parents[1]
    processed_dir = evaluation_dir / "results" / "processed"
    figure_dir = evaluation_dir / "results" / "figures"
    processed_dir.mkdir(parents=True, exist_ok=True)
    figure_dir.mkdir(parents=True, exist_ok=True)

    data = pd.read_csv(source)
    data["outcome_success"] = data["outcome_success"].astype(bool)
    summary = (
        data.groupby(["scenario", "variant", "roster_size"], sort=True)
        .agg(
            runs=("outcome_success", "size"),
            outcome_success_rate=("outcome_success", "mean"),
            state_preservation_rate=("state_preservation_rate", "mean"),
            elapsed_median_ms=("elapsed_ms", "median"),
            elapsed_p95_ms=("elapsed_ms", lambda values: values.quantile(0.95)),
        )
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
                "records": int(len(data)),
                "groups": summary.to_dict(orient="records"),
            },
            ensure_ascii=True,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    scenario_order = ["stable-identity", "state-continuity", "message-order", "transient-empty"]
    protected_variants = {
        "stable-identity": "full-protocol",
        "state-continuity": "state-preserving-merge",
        "message-order": "sequence-guard",
        "transient-empty": "empty-payload-guard",
    }
    ablated_variants = {
        "stable-identity": "without-stable-id",
        "state-continuity": "replace-all",
        "message-order": "without-sequence-guard",
        "transient-empty": "without-empty-guard",
    }
    labels = ["Stable identity", "State continuity", "Message order", "Transient empty"]
    averaged = data.groupby(["scenario", "variant"])["outcome_success"].mean()
    protected = [averaged.get((scenario, protected_variants[scenario]), np.nan) * 100 for scenario in scenario_order]
    ablated = [averaged.get((scenario, ablated_variants[scenario]), np.nan) * 100 for scenario in scenario_order]

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
    x = np.arange(len(labels))
    width = 0.34
    fig, ax = plt.subplots(figsize=(7.09, 3.45))
    bars_a = ax.bar(x - width / 2, protected, width, label="Safeguard enabled", color="#3B6FB6")
    bars_b = ax.bar(x + width / 2, ablated, width, label="Safeguard removed", color="#D9792B")
    ax.set_ylabel("Correct outcome (%)")
    ax.set_xticks(x, labels)
    ax.set_ylim(0, 108)
    ax.set_yticks([0, 20, 40, 60, 80, 100])
    ax.grid(axis="y", color="#D9DDE3", linewidth=0.7)
    ax.set_axisbelow(True)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, ncol=2, loc="lower center", bbox_to_anchor=(0.5, 1.02))
    for bars in (bars_a, bars_b):
        for bar in bars:
            value = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, max(value + 2, 2), f"{value:.0f}", ha="center", va="bottom", fontsize=8)
    fig.tight_layout(pad=0.8)
    figure_png = figure_dir / f"{stem}_outcomes.png"
    figure_pdf = figure_dir / f"{stem}_outcomes.pdf"
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
