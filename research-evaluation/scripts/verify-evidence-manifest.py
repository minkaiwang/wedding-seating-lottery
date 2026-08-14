from __future__ import annotations

import argparse
import hashlib
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
MANIFEST = REPOSITORY_ROOT / "research-evaluation" / "JSS_EVIDENCE_MANIFEST_SHA256.txt"

EXPLICIT_PATHS = (
    ".github/workflows/ci.yml",
    ".github/workflows/property-evaluation.yml",
    "package.json",
    "package-lock.json",
    "log-lottery/package.json",
    "log-lottery/package-lock.json",
    "research-evaluation/README.md",
    "research-evaluation/PROTOCOL.md",
    "research-evaluation/RESULTS_REPORT.md",
    "research-evaluation/DEFECT_LOG.md",
    "research-evaluation/PROPERTY_PROTOCOL.md",
    "research-evaluation/PROPERTY_RESULTS_REPORT.md",
    "research-evaluation/scripts/run-ablation-evaluation.ts",
    "research-evaluation/scripts/run-bridge-e2e.mjs",
    "research-evaluation/scripts/run-live-sync-faults.mjs",
    "research-evaluation/scripts/run-property-evaluation.ts",
    "research-evaluation/scripts/summarize_ablation.py",
    "research-evaluation/scripts/summarize_bridge.py",
    "research-evaluation/scripts/summarize_faults.py",
    "research-evaluation/scripts/verify-evidence-manifest.py",
    "research-evaluation/results/raw/bridge_production_formal_jss_field_oracle_20260812b.json",
    "research-evaluation/results/processed/bridge_production_formal_jss_field_oracle_20260812b_summary.csv",
    "research-evaluation/results/figures/bridge_production_formal_jss_field_oracle_20260812b_latency.pdf",
    "research-evaluation/results/figures/bridge_production_formal_jss_field_oracle_20260812b_latency.png",
    "research-evaluation/results/processed/live_sync_fault_production_formal_jss_field_oracle_20260812c_summary.csv",
    "research-evaluation/results/raw/ablation_formal_jss_contract_20260812e_2026-08-12T140833483Z.csv",
    "research-evaluation/results/processed/ablation_formal_jss_contract_20260812e_2026-08-12T140833483Z_summary.csv",
    "research-evaluation/results/raw/property_formal_jss_contract_20260812d.json",
    "research-evaluation/results/processed/property_formal_jss_contract_20260812d_summary.csv",
)

GLOBS = (
    "research-evaluation/results/raw/live_sync_fault_production_formal_jss_field_oracle_20260812c_*.json",
    "research-evaluation/results/hosted/gh-run-30880727356/**/*",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def selected_paths() -> list[Path]:
    paths = {REPOSITORY_ROOT / relative for relative in EXPLICIT_PATHS}
    for pattern in GLOBS:
        paths.update(path for path in REPOSITORY_ROOT.glob(pattern) if path.is_file())
    missing = sorted(path for path in paths if not path.is_file())
    if missing:
        joined = "\n".join(str(path) for path in missing)
        raise SystemExit(f"Evidence files are missing:\n{joined}")
    return sorted(paths, key=lambda path: path.relative_to(REPOSITORY_ROOT).as_posix())


def write_manifest() -> None:
    lines = [
        "# JSS evidence manifest. Verify from the repository state containing this file.",
        "# The historical PROPERTY_MANIFEST_SHA256.txt remains tied to commit 978d43e55e6b4fcaae1356c94fdea688dbc84a42.",
    ]
    for path in selected_paths():
        relative = path.relative_to(REPOSITORY_ROOT).as_posix()
        lines.append(f"{sha256(path)}  {relative}")
    MANIFEST.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(lines) - 2} entries to {MANIFEST}")


def verify_manifest() -> None:
    failures: list[str] = []
    checked = 0
    for raw_line in MANIFEST.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        expected, relative = line.split(None, 1)
        path = REPOSITORY_ROOT / relative.strip()
        if not path.is_file():
            failures.append(f"MISSING {relative}")
            continue
        actual = sha256(path)
        checked += 1
        if actual != expected:
            failures.append(f"MISMATCH {relative}: expected {expected}, got {actual}")
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"Verified {checked} JSS evidence files")


def main() -> None:
    parser = argparse.ArgumentParser(description="Write or verify the JSS evidence SHA-256 manifest.")
    parser.add_argument("--write", action="store_true", help="Regenerate the manifest from the selected evidence files.")
    args = parser.parse_args()
    if args.write:
        write_manifest()
    else:
        verify_manifest()


if __name__ == "__main__":
    main()
