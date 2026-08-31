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

Completed in Stage 9. Not yet written.

## 6. Column security profiles

Completed in Stage 10. Not yet written.

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
