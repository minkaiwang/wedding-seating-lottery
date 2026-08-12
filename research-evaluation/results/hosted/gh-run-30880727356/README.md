# Hosted property replay archive

This directory preserves the artifacts downloaded from GitHub Actions run
`30880727356` before the service retention window expires.

The run replayed the same nine properties and 18,000 fixed-seed cases on Linux,
Windows, and macOS. Each operating-system folder contains the raw JSON report
and processed CSV summary uploaded by the workflow. The raw reports record the
source fingerprint, runtime, seeds, skips, failures, shrinks, and case counts.

These files preserve the cited cross-environment replay evidence. The workflow
ran on the property-evaluation branch at the commit recorded by GitHub Actions;
it is not evidence that a later branch tip passed CI. `SHA256SUMS.txt` records
the exact downloaded bytes.
