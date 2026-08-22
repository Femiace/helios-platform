# ADR-007. Pipeline host selection and the Managed Environments requirement

Status: Accepted. Host revisited in Module 11.
Date: Module 1, Stage 7.

## Context

Power Platform Pipelines requires every target environment to be a Managed
Environment. Source environments and the host itself do not.

Managed Environments has no separate SKU. It gates access by user licence: managed
environment use rights are not included in the Power Apps Developer Plan, so running
assets in a managed developer environment requires a premium licence.

Two host models exist. The platform host provisions itself in the tenant home
geography on first visit to the Pipelines page. A custom host is a dedicated
environment with the Power Platform Pipelines package installed.

## Correction to source documentation

Doc 04 Section 1.2 states that target environments only need to be managed if they
are not developer environments. Incorrect. All pipeline targets must be managed
regardless of environment type.

The error originates in a Learn sentence stating that managed environments are not
required for "the pipelines host or developer environments". There, developer
environment means the pipeline role, the source, not the Developer environment type.

Doc 03's claim that a DEV to TEST pipeline works without any paid licence is half
correct. The pipeline works. Running apps or flows in the managed target does not,
on the Developer Plan alone.

## Decision 1. Managed Environments

Enabled on HELIOS TEST only. Not on HELIOS DEV or HELIOS SANDBOX.

TEST is imported into and inspected, never executed in. Nothing in the specification
requires runtime there; all execution evidence is produced in DEV. SANDBOX stays
unmanaged because the Module 11 layer exercise needs runtime.

## Decision 2. Platform host for Module 1

Pipeline HELIOS DEV to TEST created as a personal pipeline on the platform host.
No additional environment consumed, which matters at a cap of three.

## Decision 3. Cross-Geo Solution Deployment enabled

Required. HELIOS DEV is GBR; HELIOS TEST and HELIOS SANDBOX are CHE. With the
setting off, the target picker returned "No environments found". With it on, both
CHE environments listed immediately.

So the picker filters on the specific region assigned within a macro geography, not
on the macro geography itself. This resolves an ambiguity between the Learn page,
which describes the filter as the geographical region of the host, and the FAQ, which
describes it as the location specified when creating environments. The Learn page
wording is the accurate one.

Microsoft's note is that this setting enables data to be shared across geographical
regions within the tenant. On a client engagement that is a governance decision
requiring sign-off. Accepted here because this is a personal development tenant and
both regions sit inside one Europe and UK residency boundary.

Consequence: the region split recorded in ADR-006 is mitigated by configuration
rather than resolved. Any future environment must be checked against the host region
before being added to a pipeline.

## Decision 4. Custom host in Module 11

Personal pipelines cannot be extended, so F6, the pre-deployment approval and
solution checker gate, cannot run on one. Module 11 rebuilds the pipeline on a
custom host. The Module 1 pipeline is disposable by design, and building both models
is what the objective "Implement and extend Power Platform Pipelines" asks for.

Host candidate: not yet decided. The tenant Default environment was the leading
candidate but has no Dataverse database, which a custom host requires. Options for
Module 11 are adding Dataverse to Default, or repurposing SANDBOX.

## Empirical findings

The platform host provisions asynchronously and took substantially longer than the
documented "first visit" implies. During that window the Manage pipelines command was
greyed out, matching the documented condition that the button is disabled when no
host is available. It became clickable once provisioning completed. Latency, not a
missing security role: the platform host configuration app is accessible to any
tenant administrator.

The target picker does not filter on Managed Environment state. HELIOS SANDBOX
appeared as a selectable target while unmanaged.

What happens if an unmanaged target is selected is not known and was not tested.
Three candidates: deployment fails with a Managed Environments error; the target is
silently converted to Managed on association or first deployment; or the requirement
is compliance guidance rather than a technical gate. Microsoft's phrasing, that
targets "have always been required to be managed environments for compliant usage",
and the documented behaviour that targets managed by a host automatically convert,
both point toward conversion rather than refusal.

Not tested deliberately. Two of the three outcomes would convert HELIOS SANDBOX to a
Managed Environment, which would put its runtime behind a premium licence and break
the Module 11 solution layer exercise.

Related: the tenant-level setting that automatically converts pipeline environments
to Managed is available in this tenant and has been left off, for the same reason.

## Alternatives rejected

Declining Managed Environments on TEST. Would remove pipelines from the build,
reducing G4 to a written exercise. The runtime right surrendered is one the build
never uses.

Building a custom host now. Needs a fourth Dataverse environment; Module 1 delivers
scaffolding, not the full ALM run.

Leaving cross-geo off and rebuilding environments to align regions. Rejected in
ADR-006 on evidence that region assignment within a macro geography is not
controllable.

## Consequences

HELIOS TEST is import-and-inspect only from this point.

The Module 1 pipeline is replaced in Module 11 and is not migrated.

Cross-geo data sharing is enabled tenant-wide on the platform host.

## References

- https://learn.microsoft.com/en-us/power-platform/alm/platform-host-pipelines
- https://learn.microsoft.com/en-us/power-platform/alm/custom-host-pipelines
- https://learn.microsoft.com/en-us/power-platform/alm/enable-cross-geo-solution-deployments
- https://learn.microsoft.com/en-us/power-platform/alm/set-up-pipelines
- https://learn.microsoft.com/en-us/power-platform/developer/plan
