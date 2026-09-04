# ADR-009: Security model for HELIOS

Status: Accepted
Date: 2026-09-04
Module: M2, Stages 2, 9 and 10
Supersedes: None

## Context

AEN is regulated. Outage duration and customer minutes lost carry
financial penalties calculated per region, so North, Midlands and South are
separately accountable. A Midlands operator must not be able to close a
North outage.

Enforcing that in app logic is not enforcement. Dataverse exposes every
table over the Web API and the Organization service, so anyone with a token
and a logical name can read and write regardless of what a canvas app
displays. The control has to sit at the data layer.

Separately, two columns carry commercially sensitive values that some users
with legitimate row access must not read: hel_replacementcost on hel_asset
and hel_compensationdue on hel_outage.

## Decision

### Structure

Three child business units, North, Midlands and South, under root
org66baaad2. Two levels deep, no region parented to another region.

Three owner teams, one per region, named North Operations, Midlands
Operations and South Operations. Owner type rather than Microsoft Entra ID
group teams.

Six security roles, all created in the root business unit:

| Role | Primary depth | Purpose |
| --- | --- | --- |
| HELIOS Control Room Operator | Business Unit | Front-line incident handling within one region |
| HELIOS Field Engineer | User | Works only work orders assigned to them |
| HELIOS Asset Planner | Organization | Owns the asset register, read-only on incidents |
| HELIOS Regional Manager | Parent and Child Business Units | Regional oversight, assignment and delete |
| HELIOS Compliance Auditor | Organization, Read only | Regulatory audit across everything |
| HELIOS Integration Service (G6) | Organization | Service principal. Only what P1 to P4 and F1 to F7 require. |

Three column security profiles: HELIOS Commercial Data, HELIOS Regulatory
Financials, HELIOS Integration Column Access.

### Placement

All six roles live in the root business unit. Only roles from the
environment business unit can be added to a solution, so a role created in
a child business unit could never be deployed to TEST. Dataverse then
replicates each root role into every child business unit automatically,
producing twenty-four role rows for six roles.

## Rationale

### Depth per role

Depth answers one question: whose rows does this person legitimately need
to touch.

Business Unit for the Control Room Operator, because the regulatory clock
and its penalty belong to one region.

User for the Field Engineer, because an engineer works their own jobs.
Engineer Profile at User-level Write is why hel_engineerprofile is User or
team owned; organization ownership would have forced Organization-level
Write and let every engineer edit every other engineer's certification
expiry.

Organization for the Asset Planner on the register, read-only on incidents,
because the register is their job and the incident is not.

Parent and Child for the Regional Manager. On a two-level tree this is
identical to Business Unit for a user in a region and differs only for a
user in root. It is the setting that survives the tree deepening.

Organization Read only for the Compliance Auditor, because column security
rather than row security is what constrains them.

Organization for the Integration Service, because a service principal has
no meaningful business unit context. Its restriction is which verbs on
which tables, derived from the component inventory.

### Delete

Only HELIOS Regional Manager holds Delete on outages and work orders. These
are regulatory records against which penalties are calculated. No role
holds Delete on Grid Asset, which makes P1 in M6 the only controlled path
for retiring an asset.

### Append and AppendTo

Every table that is the target of a lookup carries AppendTo in any role
that creates the referencing record. Dataverse checks both sides of a
lookup write and reports the failure against the referenced table, not the
one being created, which makes the error misleading.

### App Opener

On for the five human roles. Off for HELIOS Integration Service, which
instead receives Read on Process so that flows can run.

### Column security

Enforced on two columns. hel_compensationdue is granted Read without Update
outside the integration profile, because P3 derives it from customers
affected, SLA target minutes and penalty per minute, and a person typing
over it breaks the audit trail.

Profiles are assigned to users and teams, not to roles. The Compliance
Auditor role grants no column access by itself.

Column-level security does not apply to users holding System Administrator.
Any verification must use an identity without that role.

## Consequences

Business units and teams are not solution components. They will not travel
to TEST through the pipeline and must be recreated there before the M11
run, or the imported roles will have no child business units to replicate
into.

Role IDs are not stable across environments because of replication. Code
that resolves a role must match on roletemplateid or name, never roleid.

hel_fieldnote has no privilege row of its own. The Activity privilege under
Core Records governs every activity type in the environment at once.

The application user currently holds System Administrator alongside HELIOS
Integration Service. Privileges only add, so G6 is inert today. Tightening
it is the M10 exercise the coverage matrix specifies under "Troubleshoot
operational security issues".

Testing regional scoping with a real regional user is not possible with one
interactive identity. Verification is done through the service principal
over the Web API with client credentials, which tests the more interesting
role anyway.

## Alternatives considered and rejected

Microsoft Entra ID group teams instead of owner teams. Correct at
production scale because membership is managed once in Entra and derived at
runtime in every environment. Rejected because the tenant has one
interactive user, so the pattern would demonstrate nothing observable.

Record ownership across business units, the matrix data access structure.
Rejected. Documented by Microsoft as not recommended for production and
still carrying a preview label, and the classic owning-business-unit model
is what PL-400 tests.

Roles created per business unit rather than in root. Rejected. Not
solution-portable.

Decimal Number instead of Currency for the two sensitive columns, to avoid
the unsecurable base column. Rejected after the Stage 10 test proved the
base column does not leak. See ADR-008 amendments.

Hierarchy security as an alternative to Parent and Child depth. Not used.
Manager and position hierarchies solve a different problem and add a second
access-resolution mechanism to reason about.

## References

Security concepts in Microsoft Dataverse:
https://learn.microsoft.com/power-platform/admin/wp-security-cds
Security roles and privileges:
https://learn.microsoft.com/power-platform/admin/security-roles-privileges
Dependency tracking for solution components:
https://learn.microsoft.com/power-platform/alm/dependency-tracking-solution-components
Column-level security to control access:
https://learn.microsoft.com/power-platform/admin/field-level-security
Activity tables:
https://learn.microsoft.com/power-apps/developer/data-platform/activity-entities