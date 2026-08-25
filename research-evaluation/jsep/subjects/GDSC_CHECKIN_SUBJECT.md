# External reference subject: roster to check-in

Protocol amendment freeze date: 2026-08-26

## Provenance

- Repository: <https://github.com/GDSC-ESTIN/checkin-system>
- Pinned commit: [`839831c9be7d2409e825ca14d27a3c285bde3764`](https://github.com/GDSC-ESTIN/checkin-system/commit/839831c9be7d2409e825ca14d27a3c285bde3764)
- Commit date: 2024-04-25
- Repository license: MIT
- Relevant source files:
  - [`data and mailer/generate.js`](https://github.com/GDSC-ESTIN/checkin-system/blob/839831c9be7d2409e825ca14d27a3c285bde3764/data%20and%20mailer/generate.js)
  - [`backend/app.js`](https://github.com/GDSC-ESTIN/checkin-system/blob/839831c9be7d2409e825ca14d27a3c285bde3764/backend/app.js)
  - [`README.md`](https://github.com/GDSC-ESTIN/checkin-system/blob/839831c9be7d2409e825ca14d27a3c285bde3764/README.md)

The repository separates roster preparation, a CSV-backed check-in service, and a scanner client. Its generator assigns an `id` to roster rows; the backend later owns and updates the `checked` field. This split supplies an independently authored data model in which a future roster-correction path would need to retain generated identifiers while updating roster fields without erasing destination-owned check-in state.

## Adaptation boundary

The evaluation re-expresses the pinned schema through a new adapter and deterministic synthetic records. It does not copy the repository's implementation, call its email or QR-code paths, or claim to test its deployed behavior. The synchronization operation is an evolution scenario for adding post-import roster correction to the published data model, not a feature claimed by the upstream repository. Its input assumes that the initial generator's identifiers have been retained; random identifier regeneration is modeled as a faulty update.

The external repository is therefore an **external open-source reference subject**. It tests whether the checker core can accept a second independently authored schema without modification. The adapter and the transfer scenarios remain authored and executed by this research team, so the result is not independent external validation.

## Field ownership used by the adapter

| Projection | Fields |
|---|---|
| Semantic identity | generated and retained `id` |
| Source-owned public state | normalized `email`, `username`, `teamName`, `tShirt` |
| Destination-owned state | `checked` |
| Replacement | initial roster import |
| Synchronization | later roster correction while preserving check-in state |

Only synthetic email addresses under `.test` are used. No upstream or wedding participant data enters the evaluation.
