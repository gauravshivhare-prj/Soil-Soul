# Safe Feature Development Workflow

The project is intentionally developed slowly and incrementally.

## Step 1: Define the change

Before coding, state:
- What user-visible behavior is required?
- What is explicitly out of scope?
- Which files/modules are expected to change?
- What acceptance criteria prove completion?

## Step 2: Inspect existing code

Read the relevant files, package scripts, tests, and current documentation. Do not recreate a working project or overwrite files blindly.

## Step 3: Plan the smallest change

Prefer one coherent change at a time. Avoid bundling unrelated refactors, styling changes, dependency upgrades, and business logic into one patch.

## Step 4: Implement

- Follow current architecture.
- Keep functions focused.
- Add validation and error handling at boundaries.
- Document public or non-obvious functions.
- Do not add real credentials.
- Do not invent behavior beyond the requirement.

## Step 5: Verify

Run relevant lint, tests, and build. Test the affected path manually when appropriate. Fix failures before proceeding.

## Step 6: Review the diff

Check:
- No accidental files or generated output.
- No secrets or local data.
- No unrelated changes.
- No stale comments.
- No broken environment examples.
- No claims unsupported by tests.

## Step 7: Update documentation

Update relevant docs, API contracts, schemas, and setup instructions in the same change.

## Step 8: Save a known-good milestone

When Git is initialized, make a small descriptive commit after checks pass. Do not commit secrets or broken intermediate work just to save progress.

## AI coding assistant instructions

When asking an AI assistant to work:
1. State the exact phase and allowed files.
2. Ask it to inspect before editing.
3. Explicitly forbid unrelated rewrites.
4. Require a summary of changed files and rationale.
5. Require commands actually run and their results.
6. Ask it to stop after the specified task and wait for approval.

A prompt cannot guarantee correctness. Always inspect the diff and run the checks locally.
