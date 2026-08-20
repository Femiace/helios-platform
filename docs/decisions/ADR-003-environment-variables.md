# ADR-003. Environment variables versus hardcoding and configuration tables

Status: Accepted. One variable deferred, see Open items.
Date: Module 1, Stage 4.

## Context

HELIOS has three candidate homes for a configuration value: hardcoded in the
consuming component, a Dataverse configuration table (hel_compliancerule,
hel_sladefinition), or an environment variable.

Microsoft's stated criterion is that environment variables suit flat key and value
pairs whose value needs to differ between environments, and that relational
configuration belongs in a custom table.

## Decision

Four environment variables, placed with their consumers.

| Variable | Type | Solution | Default | Current in DEV |
| --- | --- | --- | --- | --- |
| hel_ApprovalThresholdCustomers | Decimal number | Automation | 5000 | 50 |
| hel_WeatherApiBaseUrl | Text | Automation | none | none until M9 |
| hel_AgentDisplaySuffix | Text | Agent | none | " (DEV)" |
| hel_KeyVaultSecret | Secret | Automation | n/a | deferred, see Open items |

Placement rule: a variable lives in the solution of its only consumer. If consumers
span more than one solution it lives in Core. None qualified for Core.

Current values are removed from the solution before export. Default values travel.

## Reasoning

hel_AgentDisplaySuffix is the canonical case: the value differs per environment by
definition. It has no default value deliberately, so that an import cannot silently
produce a TEST agent labelled as DEV.

hel_KeyVaultSecret is a variable because it is a credential, not because it varies.

hel_WeatherApiBaseUrl is architecturally weak in this build because the public API
is the same in all three environments. It is retained because the PL-400 objective
on connector policy templates requires setting a host URL from an environment
variable, and because a production build would target a sandbox endpoint in
non-production.

hel_ApprovalThresholdCustomers is a threshold, and thresholds in HELIOS otherwise
live in hel_compliancerule. It is an environment variable only because the
non-production value is deliberately lowered so that the F1 approval branch is
reachable without seeding an outage affecting thousands of customers. That is an
environment-varying concern rather than a business rule. The default value carries
the production-shaped number and the DEV current value carries the low one, so the
implementation matches the justification.

## Alternatives rejected

Hardcoding the approval threshold in F1. Rejected on testability.

Storing the approval threshold in hel_compliancerule alongside the other thresholds.
The more consistent choice on cohesion grounds, and the correct one if the value
were business policy. Rejected because the value varies for test reasons, and
compliance rule rows do not vary by environment.

Placing all four variables in Core as a single configuration surface. Rejected
because it puts components in Core that only downstream solutions consume, and it
makes every environment prompt for values it does not use.

Data source environment variables. Not applicable in Module 1. They apply to
SharePoint, SQL and cross-environment Dataverse tables, none of which HELIOS uses.
Dataverse tables in the current environment resolve by name in the target and need
no variable. The Power Apps Studio setting that auto-creates them is off by default
and is evaluated in Module 5, not here.

## Consequences

Import prompts by solution: Automation asks for three values, Agent asks for one,
Core and Logic ask for none. The prompt set identifies the layer being configured.

Customer counts are stored and compared as decimals, because Dataverse offers no
integer environment variable type.

A value that arrives inside a managed solution can only be deleted by exporting a
new version without it and importing as an upgrade rather than an update. Stripping
current values before export avoids this entirely.

Environment variable value changes propagate to apps and flows asynchronously and
can take up to an hour.

## Open items

hel_KeyVaultSecret is not created in Module 1. Secret-type environment variables
require an Azure Key Vault in the same tenant, and no Azure resources are
provisioned yet. Deferred to the module where F5 is built.

Note: document 04 Section 6.2 lists "a secret-type environment variable in
Dataverse" as the non-Azure substitution for a Key Vault secret. That substitution
does not exist. Azure Key Vault is currently the only supported secret store for
environment variables, so the secret type is not available on a no-Azure track at
all. The real non-Azure fallback is a Text environment variable holding a
non-sensitive value, plus a written explanation of what Key Vault would add.

## References

- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/environmentvariables
- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/environmentvariables-azure-key-vault-secrets
