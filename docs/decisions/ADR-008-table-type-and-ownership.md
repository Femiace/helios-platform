# ADR-008: Table type and ownership model for the HELIOS data layer

Status: Accepted
Date: 2026-08-27
Module: M2, Stage 1
Supersedes: None
Superseded by: None

## Context

Module 2 creates fourteen tables in HELIOSCore. Three properties of a
Dataverse table are written at creation and have no edit path afterwards:
the schema name, the table type, and the ownership type. Correcting any of
them means deleting the table and rebuilding it, which destroys every row,
relationship, form, view, role privilege and code reference that depends
on it.

Every module from M3 to M11 references these tables. M6 registers plug-in
steps against them by logical name. M9 addresses rows over the Web API by
entity set name. A rebuild after M6 would invalidate registered plug-in
steps and any hardcoded logical names.

The decisions therefore have to be correct now.

## Decision

### Table type

Standard for eleven tables: hel_region, hel_substation, hel_asset,
hel_outage, hel_workorder, hel_engineerprofile, hel_inspection,
hel_riskscore, hel_compliancerule, hel_sladefinition, hel_integrationlog.

Activity for hel_fieldnote, so that field notes surface in the timeline
control on both the outage and work order forms through the polymorphic
Regarding lookup, without building two separate relationships.

Elastic for hel_assettelemetry. Sensor readings are high volume, semi
structured, and disposable. The ttlinseconds column expires rows
automatically, which keeps the 2 GB developer database limit reachable at
20,000 seeded rows with a 7 day TTL.

Virtual for hel_weatherobservation, as a documented design decision only.
The physical build sits on the Azure track in M9.

### Ownership

Organization owned: hel_region, hel_substation, hel_asset, hel_riskscore,
hel_compliancerule, hel_sladefinition, hel_integrationlog,
hel_assettelemetry, hel_weatherobservation.

User or Team owned: hel_outage, hel_workorder, hel_engineerprofile,
hel_inspection, hel_fieldnote.

## Rationale

Organization ownership is chosen where the data is reference,
configuration or machine written, and where no user or business unit has a
claim on an individual row. These tables have no owning business unit, so
security roles grant access on an all or nothing basis per privilege.

User or Team ownership is chosen where a row is assigned to a person, is
scoped to a region, or requires ad-hoc sharing. These tables carry
ownerid, owninguser, owningteam and owningbusinessunit, which allows the
four tier privilege scoping used by the five security roles in Stage 9.

hel_fieldnote and hel_weatherobservation are not free choices. Activity
tables cannot be organization owned. Virtual tables support organization
ownership only.

hel_assettelemetry is organization owned deliberately. Elastic tables do
not support distinct aggregate queries against user owned tables, and
telemetry has no meaningful per row owner.

## Consequences

Accepted: hel_asset is organization owned, so region cannot restrict which
assets a user reads. The asset register is treated as shared
infrastructure knowledge. Regional scoping applies to hel_outage and
hel_workorder, which carry the operational and regulatory weight. An
engineer working across a regional boundary during a major event can still
read the asset record, which is the correct operational behaviour for a
distribution network operator.

Accepted: hel_assettelemetry loses business rules, rollup and calculated
columns, custom alternate keys, N:N relationships to standard tables,
currency columns, duplicate detection, cascade operations, table sharing,
access teams, queues, attachments, and table data import and export.

Accepted: Upsert on hel_assettelemetry raises neither a Create nor an
Update event. Any logic that must run on both paths has to be registered
on Upsert as well. This constrains F7 in M7.

Accepted: elastic tables have no multi-record transaction support. A
synchronous plug-in throwing at PostOperation against
hel_assettelemetry will not roll the row back. Validation against elastic
tables must be registered at PreValidation.

Accepted: hel_replacementcost carries column security and therefore can
never be used as an alternate key on hel_asset. The alternate key uses
hel_serialnumber, which is unsecured.

## Alternatives considered and rejected

Standard table for hel_assettelemetry. Rejected: 20,000 rows with no
expiry mechanism consumes developer database capacity that M6 and M7 need,
and it would teach none of the elastic table limitations that Domain 1 of
the exam tests.

User or Team ownership for hel_asset. Rejected: it would allow regional
row scoping on the asset register, but the register is reference data that
every operator needs to read during a cross-region event. The added owner
columns and access checks buy a restriction that would have to be
overridden operationally.

Organization ownership for hel_engineerprofile. Rejected: an engineer must
be able to update their own availability. User ownership lets that be
granted with User level Write, which is the least privilege answer.
Organization ownership would require Organization level Write, giving
every engineer the ability to edit every other engineer's profile.

Standard table for hel_fieldnote. Rejected: a standard table would need
separate lookups to hel_outage and hel_workorder and would not appear in
the timeline control without custom work.

## References

Types of tables:
https://learn.microsoft.com/power-apps/maker/data-platform/types-of-entities
Create and edit elastic tables:
https://learn.microsoft.com/power-apps/maker/data-platform/create-edit-elastic-tables
Elastic tables for developers:
https://learn.microsoft.com/power-apps/developer/data-platform/elastic-tables
Use Upsert to create or update a record:
https://learn.microsoft.com/power-apps/developer/data-platform/use-upsert-insert-update-record
Limitations of virtual tables:
https://learn.microsoft.com/power-apps/developer/data-platform/virtual-entities/get-started-ve
Define alternate keys to reference rows:
https://learn.microsoft.com/power-apps/maker/data-platform/define-alternate-keys-reference-records
Edit a table, options that can only be enabled:
https://learn.microsoft.com/power-apps/maker/data-platform/edit-entities
