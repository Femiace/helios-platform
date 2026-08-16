# ADR-001. Publisher identity, prefix and option value prefix

Status: Accepted.
Date: Module 1, Stage 2.

## Context

Every custom metadata item in Dataverse carries the customization prefix of the
publisher of the solution it was created in. The prefix cannot be retrofitted:
changing a publisher prefix does not rename metadata that already exists, so the
decision is effectively permanent from the first table onward.

The environment also ships with a Microsoft Dataverse Default Publisher whose
prefix is randomly assigned. Components created outside a solution context land
there, in a Default Solution that cannot be exported and whose publisher prefix
cannot be changed.

## Decision

| Field | Value |
| --- | --- |
| Display name | Aldergate Energy Networks |
| Unique name | aldergateenergynetworks |
| Customization prefix | hel |
| Option value prefix | 10000 |

Created once, in HELIOS DEV only. TEST and SANDBOX receive the publisher record
via managed solution import, not by hand.

## Reasoning

1. The publisher names the developing organisation. The prefix names the product.
   These are deliberately different scopes. Specification Section 5 already fixes
   every schema name at hel_, so the prefix is constrained by the data model.
2. Option value prefix forced to 10000 rather than the auto-generated number.
   The auto-generated value has lower collision probability across publishers;
   10000 is more readable and this is a single-publisher environment where the
   collision cannot occur. Readability wins here and would not win in an ISV build.
3. Created through the maker portal rather than the Web API or pac CLI, because
   the interactive CLI token is unreliable until the service principal exists in
   Stage 6, and the portal path is the one the exam models.

## Alternatives rejected

Organisation-scoped prefix `aen`. Rejected because specification Section 5 writes
`hel_` into every table and column in the data model. This is the more defensible
choice for internal IT building multiple products on one platform, and the
consequence of not taking it is recorded below.

Product-scoped publisher named HELIOS Platform with prefix `hel`. Internally more
consistent than what was chosen, but it discards the AEN organisational identity
that the business scenario depends on.

Leaving the option value prefix auto-generated. Rejected on readability grounds
for this build only.

## Consequences

If Aldergate Energy Networks later builds a second platform on Dataverse, it must
either reuse the hel prefix on unrelated components or introduce a second
publisher. Neither is free. This is accepted.

Every alternate key created in Modules 2 and 6, including hel_serialnumber on
hel_asset and the composite key on hel_riskscore, will carry the hel prefix in its
key name because the key name is derived from the publisher of the solution it is
created in.

Tripwire: any schema name beginning with the default publisher prefix instead of
hel_ means a component was created outside a solution context. Fix by deleting and
recreating the component, not by editing the publisher.

## References

- https://learn.microsoft.com/en-us/power-platform/alm/solution-concepts-alm
- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-solution
- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/preferred-solution
