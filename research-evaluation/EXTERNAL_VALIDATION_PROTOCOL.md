# External Device and Independent Operator Validation Protocol

## 1. Status and purpose

Status: prepared, not yet executed.

This protocol addresses two residual limitations without reusing private wedding data: native Safari or another physical device has not been tested, and all current controlled runs were executed by the developer-researcher. Results may enter the manuscript only after the fields below are completed from an actual run and the raw task log is retained.

## 2. Required conditions

Use one of the following configurations:

1. A physical macOS device with the current native Safari release; or
2. A physical device different from the development computer, with its installed Chrome, Firefox, or Edge browser.

The operator must not be the system developer. The operator may receive the task sheet but should not receive step-by-step coaching during execution. Use only a generated roster of 200 synthetic records. Do not transfer a wedding roster, photograph, contact detail, questionnaire response, or field export.

## 3. Fixed tasks

| Task | Required action | Observable success condition |
|---|---|---|
| T1 Initial handoff | Open the seating preview and use the one-click lottery import | Lottery window opens; 200 records are present after completion |
| T2 Destination verification | Compare displayed count and five preselected synthetic stable IDs with the source checklist | Count and all five IDs match |
| T3 State continuity | Mark one synthetic record as a winner, change that record's public table/name field at the source, and re-import | Lottery-side internal identity, winning state, and prize history remain; public fields update |
| T4 Repeat import | Repeat the unchanged import once | No duplicate stable IDs are created |
| T5 Explicit clear and recovery | In an isolated test copy, send the documented zero-roster action, then restore the 200-record source | Clear is explicit; full roster can be restored |
| T6 Fallback | Follow the written fallback path after the evaluator deliberately withholds completion confirmation | Operator identifies that public action must not start and uses the recorded fallback |

T5 and T6 must run only in a synthetic isolated environment. They must not be attempted during a real event.

## 4. Measures

Record for each task:

- completion: pass/fail;
- elapsed time from task start to observable condition;
- incorrect action count;
- assistance requested: yes/no and exact request;
- recovery action and final state;
- protocol deviation, if any;
- browser console or application error, if any.

After all tasks, ask the operator one open question: "Which status or step, if any, was unclear before you would allow the public lottery to begin?" This response is diagnostic only. One operator cannot establish usability, workload reduction, or general user experience.

## 5. Environment record

- Date and local time:
- Device manufacturer/model:
- Operating system and version:
- Browser and version:
- Screen size and input method:
- Source commit:
- Lottery build hash:
- Seating build hash:
- Synthetic dataset hash:
- Operator relationship to development: independent / other (explain):
- Observer:

## 6. Reporting rule

Report task-level outcomes, deviations, and exact environment. Do not merge these six tasks with the 360 production-browser transfers, the 630 fault-sequence outcomes, the 3,200 ablation records, or the 18,000 generated property cases. A successful run supports protocol executability on that device with that operator; it does not prove universal usability or live-event reliability.
