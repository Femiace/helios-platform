# ADR-007. Environment region assignment and cross-geo posture

Status: Accepted.
Date: Module 1, Stage 6R.

## Context

During service principal verification in Stage 6, pac auth who revealed that the
three environments were split across two Dataverse regions. HELIOS DEV reported
Environment Geo GBR on crm11. HELIOS TEST and HELIOS SANDBOX reported CHE on crm17.

The split was not visible in the Power Platform admin center environment list and
was surfaced only by the Environment Geo line in pac auth who.

## Finding

The split was not a configuration error. The environment creation panel exposes a
field named Macro Region Geography, not Region. Its help text states that it
determines data residency boundaries and that the system assigns a specific region
within that geography based on capacity.

For a Developer type environment on the Power Apps Developer Plan the dropdown
offers six macro geographies: Asia Pacific, Europe UK Middle East Africa, European
Union and EFTA, Europe and UK, North America, and The Americas. There is no
United Kingdom entry. Switzerland is inside the Europe and UK boundary, so CHE is a
valid assignment within the selection made.

Tenant Country is GB. Tenant registration country and environment data residency are
independent.

## Empirical results

HELIOS SANDBOX was deleted and recreated with the same macro geography as a
controlled test. It was assigned CHE again. Re-rolling does not yield GBR.

Deleting a developer environment released both its cap slot against the
three-environment limit and its URL immediately. The replacement was created on the
original helios-sandbox URL within minutes, with a new Environment Id.

## Decision

No further rebuild. HELIOS DEV remains GBR. HELIOS TEST remains CHE with its
application user intact. HELIOS SANDBOX remains CHE with a new Environment Id.

Cross-geo pipeline behaviour is tested empirically in Stage 7 rather than assumed.
If the target picker filters on specific region rather than macro geography,
cross-geo solution deployments is enabled as a tenant setting. That is a
configuration change, not a rebuild.

## Correction to an earlier position

An earlier draft of this record argued that UK grid asset data in a Swiss
environment was indefensible on data residency grounds and justified rebuilding.
That argument was wrong.

Microsoft's residency boundary for this environment type is the macro geography.
Europe and UK is the boundary, and no finer control is offered. A UK organisation
building on the Developer Plan cannot obtain a United Kingdom only guarantee. The
accurate statement for an interview is that data remains within the Europe and UK
residency boundary, with the specific region assigned on capacity.

Whether paid tenants provisioning production or sandbox environments are offered a
granular United Kingdom region has not been verified and is not claimed here.

## Alternatives rejected

Rebuild HELIOS TEST in pursuit of GBR. Rejected on evidence: the SANDBOX rebuild
returned CHE, so the outcome is not controllable, and TEST would lose its
application user for a coin toss.

Rebuild HELIOS DEV in CHE to align all three. Rejected: DEV holds the publisher,
five solutions, three environment variables and a connection reference, none of it
yet in source control.

Abandon Power Platform Pipelines in favour of GitHub Actions alone. Rejected before
the cross-geo behaviour has even been observed.

## Consequences

Pipeline viability across a GBR source and a CHE target is unproven and is the first
thing Stage 7 establishes.

Latency on any operation crossing between DEV and TEST is higher than a same-region
pair. Immaterial at this data volume.

Environment rebuilds are cheaper than assumed: slot and URL both free immediately.

## Process note

The split was present from Module 0 and survived six stages. Contributing cause: an
assertion that all environments were GBR, made from a single pac auth who against
DEV alone.

Verify per environment. Do not generalise an environment-scoped reading across a
tenant. Read the Environment Geo line, not the URL stem, and not one environment as
a proxy for three.

## References

- https://learn.microsoft.com/en-us/power-platform/alm/set-up-pipelines
- https://learn.microsoft.com/en-us/power-platform/alm/custom-host-pipelines
