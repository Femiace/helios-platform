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

## Amendment. Module 1, Stage 8. Decision confirmed on evidence

The XML format decision was made on contradictory Microsoft documentation, with a
commitment to settle it against the tooling before solutions were unpacked. Done.

Power Platform CLI 2.11.2 (.NET Framework 4.8):

| Command | Format switch |
| --- | --- |
| pac solution export | None. --managed selects managed or unmanaged, not extraction format |
| pac solution unpack | None. Fifteen parameters, no --format, no YAML option |
| pac solution clone | Present on this build, but also no format switch |

No command can request YAML output. The Git integration FAQ, which states that
unpack, clone and sync do not support YAML, is accurate. The YAML format reference
page, which instructs the reader to extract using pac solution clone, is wrong: that
command has no mechanism to produce YAML.

Decision stands. The Module 5 re-evaluation trigger remains, because the canvas app
question is separate and unresolved. Note that --processCanvasApps does not appear on
unpack in 2.11.2 either, so canvas handling is not reachable from this command.

## Amendment. Extraction packagetype

Unpack uses --packagetype Both, storing managed and unmanaged XML side by side, with
both zips exported per solution.

Reason: producing a managed solution for deployment requires either managed XML in
source or a separate build environment to import unmanaged and export managed. A
build environment is a fourth environment and the Developer Plan caps at three. Both
is therefore the only structure that supports a managed release from source.

Done in Module 1 while the solutions are near-empty. Restructuring five populated
folders at Module 6 would be considerably more expensive.

Export is automated by scripts/export-all.ps1, which is an addition to the repository
layout in doc 04 Section 9.
