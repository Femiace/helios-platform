# ADR-000. Source control extraction format

Status: Accepted, with a scheduled re-evaluation at Module 5.
Date: Module 1, Stage 1.

## Context

Dataverse solutions can be extracted to source in two formats. The classic XML
format is produced by `pac solution export` followed by `pac solution unpack`.
The YAML source control format is produced by `pac solution clone` or
`pac solution sync`, and is the format native Dataverse Git integration writes.

Microsoft recommends the YAML format for all new projects. It supports
multi-solution repositories, canvas apps and modern cloud flows, none of which
the XML format supports, and it produces smaller diffs.

## Decision

Use the XML format with one folder per solution under `solutions/`.

## Reasoning

1. The PL-400 objectives and every Microsoft ALM sample use export, unpack, pack,
   import. This build is primarily a certification build, so the tooling path
   should match the one the exam models.
2. Microsoft's documentation currently contradicts itself on YAML tooling support.
   The YAML format reference instructs the reader to extract with
   `pac solution clone` or `pac solution sync`. The Git integration FAQ states that
   unpack, clone and sync do not currently support the YAML format. Committing the
   whole repository to a path with an unresolved documentation conflict, before a
   single export has been run, is an unnecessary week-one risk.
3. `solutions/<name>/` is the root folder convention in both formats, so this
   decision does not lock the repository layout.
4. Five segmented solutions means five single-solution folders. `pac solution pack`
   supports single-solution folders directly. The YAML multi-solution layout would
   require SolutionPackager.exe with /SolutionName, adding a tooling dependency to
   the GitHub Actions workflows in Module 11.

## Alternatives rejected

YAML source control format with a shared component root. Rejected for now on
tooling-contradiction risk, not on merit. It is the better long-term format.

Native Dataverse Git integration committing directly from make.powerapps.com.
Rejected because it removes the CLI from the loop, and the CLI is what the exam
tests. It also binds to a single branch per environment, which constrains the
Module 11 branching exercise.

## Consequences

The XML format is documented as not supporting canvas apps or modern cloud flows.
HELIOS has one canvas app, one component library and seven cloud flows. If the
empirical behaviour of pac 2.10.1 matches the documentation, this decision must be
revisited at Module 5.

Re-evaluation trigger: Module 1 Stage 8 export test, and Module 5 first canvas app
commit.

## References

- https://learn.microsoft.com/en-us/power-platform/alm/use-source-control-solution-files
- https://learn.microsoft.com/en-us/power-platform/alm/solution-source-control-yaml-format
- https://learn.microsoft.com/en-us/power-platform/alm/git-integration/faqs
