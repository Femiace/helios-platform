# HELIOS security model

Module 2. Written incrementally across Stages 2, 9 and 10.

## 1. Business unit structure

Completed in Stage 2.

Environment: HELIOS DEV (helios-dev.crm11.dynamics.com)

| Business unit | Parent | Created | Purpose |
| --- | --- | --- | --- |
| org66baaad2 | None (root) | By the platform at provisioning | Holds HELIOS Admin, both application users, and all five security roles |
| North | Root | M2 Stage 2 | North region operational security boundary |
| Midlands | Root | M2 Stage 2 | Midlands region operational security boundary |
| South | Root | M2 Stage 2 | South region operational security boundary |

The tree is two levels deep. Every region is a direct child of root and no
region is a child of another region. This makes the Business Unit depth and
the Business Unit and Child Business Units depth behave identically for a
user sitting in a region, and makes them differ only for a user sitting in
root. That difference is used deliberately in Stage 9.

### Business units and hel_region are not linked

The business unit named North and the hel_region row named North are
separate objects in separate tables with no enforced relationship. The
business unit is a security boundary. The hel_region row is business data
that substations, engineer profiles and SLA definitions point at with
lookup columns.

Risk: renaming one does not rename the other. Keeping the two name sets
aligned is a manual discipline. Any future rename must be applied in both
places in the same change.

## 2. Teams

Completed in Stage 2.

| Team | Business unit | Type | Members at Stage 2 | Purpose |
| --- | --- | --- | --- | --- |
| Default team per business unit | One each | Default | All users in that business unit, automatically | Platform managed. Cannot be renamed or deleted. |
| North Operations | North | Owner | HELIOS Admin | Owns North outages and work orders |
| Midlands Operations | Midlands | Owner | None | Owns Midlands outages and work orders |
| South Operations | South | Owner | None | Owns South outages and work orders |

HELIOS Admin was added to North Operations only. Midlands Operations and
South Operations are deliberately left empty so that Stage 9 has a control
group when testing member's privilege inheritance.

No security roles are assigned to any team at Stage 2 because no custom
roles exist yet.

### Team type decision

Owner teams were chosen over Microsoft Entra group teams. Entra group
teams are the correct production answer because membership is managed once
in Entra and derived at runtime in every environment. They were not built
here because the tenant has a single interactive user, so an Entra group
team would demonstrate nothing observable.

Access teams are not used for row ownership. The access team template on
hel_workorder, configured in Stage 5, is a separate mechanism: it creates
a per-row team on demand for ad-hoc sharing and never owns anything.

## 3. Feature switches

| Setting | State | Reason |
| --- | --- | --- |
| Record ownership across business units | Off | Documented by Microsoft as not recommended for production and still carrying a preview label. Classic owning-business-unit behaviour is what PL-400 tests. Turning it on introduces organization settings configured outside the admin center that are not on the skills list. |

## 4. ALM constraint on the security layer

Business units and teams are not solution components. They are rows in the
businessunit and team tables. They cannot be exported in HELIOSCore and
will not travel to TEST through the pipeline.

Security roles are solution components, but only roles created in the root
business unit can be added to a solution. A role created in North,
Midlands or South can never be deployed.

Consequences:

1. All five HELIOS security roles must be created in the root business
   unit. Dataverse replicates a copy into each child business unit
   automatically.
2. Role IDs are not stable across environments because of that
   replication. Any code that looks up a role must match on
   RoleTemplateId, not on role ID.
3. The North, Midlands and South business units and the three owner teams
   must be recreated in HELIOS TEST before the M11 pipeline run, or the
   imported roles will have no child business units to replicate into.
   Deferred to M11.

## 5. Security roles

All six created in the root business unit org66baaad2 and replicated by the
platform into North, Midlands and South. Twenty-four role rows for six
roles. Role IDs are not stable; match on roletemplateid or name.

Depth key: U = User, BU = Business Unit, PC = Parent and Child Business
Units, Org = Organization, blank = None.

### HELIOS Control Room Operator

| Table | C | R | W | D | Ap | ApTo | As | Sh |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Outage Event | BU | BU | BU | | BU | BU | BU | BU |
| Work Order | BU | BU | BU | | BU | BU | BU | BU |
| Activity (Core Records) | BU | BU | BU | | BU | BU | | |
| Grid Asset | | Org | | | | Org | | |
| Substation | | Org | | | | Org | | |
| Region | | Org | | | | | | |
| Engineer Profile | | Org | | | | Org | | |
| Inspection | | Org | | | | | | |
| Risk Score | | Org | | | | | | |
| Compliance Rule | | Org | | | | | | |
| SLA Definition | | Org | | | | | | |
| Asset Telemetry | | Org | | | | | | |
| User | | Org | | | | Org | | |

### HELIOS Field Engineer

| Table | C | R | W | D | Ap | ApTo | As | Sh |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Work Order | | U | U | | U | U | | |
| Outage Event | | BU | | | | BU | | |
| Inspection | U | U | U | | U | U | | |
| Activity (Core Records) | U | U | U | | U | U | | |
| Engineer Profile | | U | U | | | | | |
| Grid Asset | | Org | | | | Org | | |
| Substation | | Org | | | | | | |
| Region | | Org | | | | | | |
| Asset Telemetry | | Org | | | | | | |

### HELIOS Asset Planner

| Table | C | R | W | D | Ap | ApTo | As | Sh |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grid Asset | Org | Org | Org | | Org | Org | | |
| Substation | Org | Org | Org | | Org | Org | | |
| Region | Org | Org | Org | | Org | Org | | |
| Inspection | Org | Org | Org | | Org | Org | | |
| Outage Event | | Org | | | | Org | | |
| Work Order | | Org | | | | | | |
| Activity (Core Records) | | Org | | | | | | |
| Risk Score | | Org | | | | | | |
| Asset Telemetry | | Org | | | | | | |
| Compliance Rule | | Org | | | | | | |
| SLA Definition | | Org | | | | | | |

### HELIOS Regional Manager

| Table | C | R | W | D | Ap | ApTo | As | Sh |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Outage Event | PC | PC | PC | PC | PC | PC | PC | PC |
| Work Order | PC | PC | PC | PC | PC | PC | PC | PC |
| Activity (Core Records) | PC | PC | PC | PC | PC | PC | PC | PC |
| Inspection | | PC | PC | | PC | PC | PC | |
| Engineer Profile | | Org | PC | | | Org | | |
| Grid Asset | | Org | | | | Org | | |
| Substation | | Org | | | | Org | | |
| Region | | Org | | | | | | |
| Risk Score | | Org | | | | | | |
| Compliance Rule | | Org | | | | | | |
| SLA Definition | | Org | | | | | | |
| Asset Telemetry | | Org | | | | | | |
| User | | Org | | | | Org | | |

### HELIOS Compliance Auditor

Read at Organization on all thirteen hel_ tables and on Activity. No other
privilege anywhere.

### HELIOS Integration Service (G6)

| Table | C | R | W | D | Ap | ApTo | As |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Outage Event | Org | Org | Org | | Org | Org | |
| Work Order | Org | Org | Org | | Org | Org | Org |
| Risk Score | Org | Org | Org | | Org | Org | |
| Integration Log | Org | Org | Org | | Org | | |
| Asset Telemetry | Org | Org | Org | | | | |
| Activity (Core Records) | Org | Org | Org | | Org | Org | |
| Grid Asset | | Org | Org | | | Org | |
| Substation | | Org | | | | Org | |
| Region | | Org | | | | | |
| Engineer Profile | | Org | | | | Org | |
| Inspection | | Org | | | | | |
| Compliance Rule | | Org | | | | | |
| SLA Definition | | Org | | | | | |
| Process | | Org | | | | | |

App Opener privileges included on the five human roles, excluded on HELIOS
Integration Service. Member's privilege inheritance left at the default,
Direct User (Basic) access level and Team privileges, on all six.

### Assignment

| Principal | Role |
| --- | --- |
| North Operations team | HELIOS Control Room Operator |
| Midlands Operations team | None. Control group. |
| South Operations team | None. Control group. |
| HELIOS ALM Service Principal application user | HELIOS Integration Service, plus System Administrator |
| HELIOS Admin | System Administrator only |

### Activity privilege note

hel_fieldnote has no privilege row. Custom activities inherit security
through ActivityPointer, so the Activity table under Core Records governs
every activity type in the environment at once.

## 6. Column security profiles

Two secured columns: hel_replacementcost on hel_asset, hel_compensationdue
on hel_outage. Both Currency type. Both IsSecured true.

| Profile | Column | Read | Read unmasked | Update | Create | Members |
| --- | --- | --- | --- | --- | --- | --- |
| HELIOS Commercial Data | hel_replacementcost | Allowed | Not Allowed | Allowed | Allowed | North Operations team |
| HELIOS Regulatory Financials | hel_compensationdue | Allowed | Not Allowed | Not Allowed | Not Allowed | North Operations team |
| HELIOS Integration Column Access | hel_replacementcost | Allowed | Not Allowed | Allowed | Allowed | HELIOS ALM Service Principal |
| HELIOS Integration Column Access | hel_compensationdue | Allowed | Not Allowed | Allowed | Allowed | HELIOS ALM Service Principal |

Profiles are assigned to users and teams, never to security roles.

Compensation Due is deliberately Read without Update outside the
integration profile. P3 derives the value from customers affected, SLA
target minutes and penalty per minute. A human overwrite would break the
audit trail.

The integration profile exists because P2, P3 and I4 write both columns as
the service principal. Without it those writes fail with no useful error.

### Empirical test, M2 Stage 10

Tested with scripts/test-column-security.ps1 using the HELIOS ALM Service
Principal authenticated by client credentials, with System Administrator
temporarily removed. Column-level security does not apply to system
administrators, so no other identity in this environment could test it.

| Run | Profile membership | hel_replacementcost | hel_replacementcost_base | hel_compensationdue | hel_compensationdue_base |
| --- | --- | --- | --- | --- | --- |
| 1 | None | null | null | null | null |
| 2 | HELIOS Integration Column Access | 45000 | 45000 | 18400 | 18400 |

Finding: base currency columns report IsSecured false and
CanBeSecuredForRead false, but their visibility tracks the source column's
permission in both directions. There is no exposure. The metadata is
misleading and only the empirical test settles it.

Second finding: a denied column is returned as null, not omitted from the
response. Plug-in and flow logic that treats null as "no value set" will
behave incorrectly when the caller simply lacks column access.

## 7. DLP policy design

G8. Deferred to M11.

## References

Create or edit business units:
https://learn.microsoft.com/power-platform/admin/create-edit-business-units
Security concepts in Microsoft Dataverse:
https://learn.microsoft.com/power-platform/admin/wp-security-cds
Microsoft Dataverse teams management:
https://learn.microsoft.com/power-platform/admin/manage-teams
Use access teams and owner teams to collaborate and share information:
https://learn.microsoft.com/power-apps/developer/data-platform/use-access-teams-owner-teams-collaborate-share-information
Dependency tracking for solution components:
https://learn.microsoft.com/power-platform/alm/dependency-tracking-solution-components
Security roles and templates:
https://learn.microsoft.com/power-apps/developer/data-platform/security-roles
Manage feature settings:
https://learn.microsoft.com/power-platform/admin/settings-features
