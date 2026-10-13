---
schema: clarification/v1
generated_at: "2026-10-10T18:01:46Z"
scope:
  - backend
  - generic
clarity_score: 0.83
rounds: 1
gaps: []
blocking_gaps: []
---

# Scenario Clarification

## Backend

- **Target framework**: Spring Boot 3.5.6 on Java 17
- **API contract preservation**: Preserve existing routes, payloads, and status behavior
- **Data migration strategy**: Assess the existing H2 data and preserve it if the current schema supports safe in-place reuse
- **Auth framework**: Preserve existing Spring Security session authentication, BCrypt passwords, and CSRF behavior
- **SLA targets**: Match current behavior without regression

## Generic

- **Success definition**: Preserve backend behavior; build succeeds, tests pass, and startup/API smoke checks pass
- **Out of scope**: Keep the React frontend and its existing user-facing flows unchanged unless API compatibility work requires coordinated changes
- **Existing test posture**: All existing tests must pass
- **Output location**: `backend-new`; leave the existing backend untouched during the rewrite
- **Additional constraints**: None beyond the decisions listed in this specification.

## Gaps & Defaults Applied

No unanswered fields or defaults applied.

## Downstream Usage Notes

The existing backend and database remain the rollback baseline. The replacement must preserve the current frontend API contract and account data.
