---
schema: clarification-answers/v1
status: submitted
generated_at: "2026-10-10T18:01:46.425Z"
scope: [backend, generic]
questions_file: clarification-questions.json
---

# Rearchitecture Clarification Answers

## ⚙️ Backend

- **B1** Which backend framework and version should the rewrite use?
  - answer: Spring Boot 3.5.6 (Java 17)
  - source: user
- **B2** How should the rewritten backend handle existing API routes, request/response payloads, status codes, and frontend compatibility?
  - answer: must preserve
  - source: user
- **B3** What should happen to the existing H2 database and its account, transaction, challenge, and money-request data during the rewrite?
  - answer: TBD / assess in research phase
  - source: user
- **B4** Which authentication approach should the rewrite use?
  - answer: preserve existing auth mechanism; detect from codebase
  - source: user
- **B5** What performance or availability target should the rewritten backend meet?
  - answer: match current production baseline; no regression
  - source: user

## 📋 General

- **G1** What measurable results will mean the backend rewrite is successful?
  - answer: Feature parity; backend builds, tests pass, and startup is verified
  - source: user
- **G2** What must not be changed as part of this backend rewrite?
  - answer: Keep the React frontend and its existing user-facing flows unchanged unless API compatibility work requires coordinated changes.
  - source: user
- **G3** How should existing backend tests be handled?
  - answer: must pass
  - source: user
- **G4** Where should the rewritten backend be created? A separate sibling folder protects the current backend and database until the replacement is verified.
  - answer: backend-new
  - source: user
- **G5** Add any additional requirements, exclusions, operational constraints, or dependencies not covered above.
  - answer: None beyond the decisions listed in this specification.
  - source: user
