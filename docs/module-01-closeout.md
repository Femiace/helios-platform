# Module 1. ALM spine

Status: Complete with two deferrals.

## Delivered

Publisher, five segmented solutions, three environment variables, one connection
reference, Entra service principal with application users in DEV and TEST,
DEV to TEST pipeline scaffolded, first export and unpack committed to source.

## Deferred

| Item | To | Reason |
| --- | --- | --- |
| hel_KeyVaultSecret | M7 | Secret-type variables require an Azure Key Vault. None provisioned |
| Least privilege application user role | M2 | System Administrator is a temporary posture, recorded in ADR-005 |
| SANDBOX application user and SPN profile | M11 | Not needed until the solution layer exercise |
| Custom pipelines host | M11 | Personal pipelines cannot carry the F6 gate. Host environment not yet chosen |
| Second Dataverse connection reference for the SPN | M7 | F5 does not exist yet |
| DEV current values on two environment variables | M7 | No consumer exists. See ADR-003 amendment |
| ADR-000 XML versus YAML re-evaluation | M5 | Canvas app support is the open question |

## Errors found in project documentation

| Document | Claim | Reality |
| --- | --- | --- |
| Doc 04 s6.2 | A secret-type environment variable in Dataverse is the non-Azure substitute for Key Vault | No Dataverse secret store exists. Azure Key Vault is the only supported store, so the Secret type is unavailable on a no-Azure track |
| Doc 04 s1.2 | Target environments only need to be managed if they are not developer environments | All pipeline targets must be managed regardless of type |
| Doc 04 s2 | Implies environments are placed in a chosen region | The field is Macro Region Geography. There is no United Kingdom option. Region within the geography is assigned on capacity |
| Doc 04 s5.2 | Verification commands include pac org who and pac --version | Neither is valid on pac 2.11.2. Use pac auth who. Version prints in every command banner |
| Doc 03 | A DEV to TEST pipeline works without any paid licence | The pipeline works. Running assets in the managed target does not, on the Developer Plan alone |

Treat both documents as a specification of intent, not a statement of platform
behaviour.

## Platform findings

Environment variable value records are added to the maker preferred solution, not to
the solution holding the definition. This inverted the ADR-002 dependency chain and
was invisible in the portal. See ADR-003 amendment.

Clearing a Current Value in the edit panel nulls the value and leaves the record and
its solution membership intact. The documented "Remove from this solution" command is
not present on that panel.

The pipeline target picker filters on specific region, not macro geography, and does
not filter on Managed Environment state. An unmanaged environment is selectable.

The platform pipelines host provisions asynchronously and took far longer than the
documentation implies. Manage pipelines is greyed out until it completes.

No pac command on 2.11.2 can request the YAML source control format.

## Definition of done, specification Section 10

| Criterion | State |
| --- | --- |
| Works end to end | Yes for publisher, solutions, variables, connection reference. Pipeline created but never run |
| Correct solution and exports cleanly | Yes. All five export and unpack with empty MissingDependencies |
| Committed as unpacked solution source | Yes |
| Decision record written | Yes. Eight ADRs |
| Can explain in under two minutes | Twenty items banked. Self-assessed |
