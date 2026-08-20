# ADR-004. Connection reference standard and import behaviour

Status: Accepted.
Date: Module 1, Stage 5.

## Context

Connections are environment-specific, owned by an identity, and never exported.
Connection references are solution components that survive the move and are bound
to a connection in the target. Flows use connection references for every connector.
Canvas apps use them only for implicitly shared, non-OAuth connections such as SQL
Server authentication, so a canvas app on Dataverse has none.

Left to itself Power Automate creates connection references automatically, with a
name composed of the connector, the current solution name and a random suffix, and
it will reuse a connection reference from a different solution before creating a
new one in the current one.

## Decision 1. Naming standard

    HELIOS <Connector> (<identity or purpose>)

The bracketed identity distinguishes connection references that share a connector
but authenticate as different principals. A deployer binding connections at import
must be able to tell them apart from the name alone.

## Decision 2. Create before use

Every connection reference is created explicitly, in the solution that owns the
consuming component, before the consuming component is authored. No connection
reference is ever created implicitly by the flow designer.

Rationale: Power Automate reuses connection references from other solutions before
creating one locally, which silently manufactures a dependency edge in the wrong
direction.

## Decision 3. Create on demand, not speculatively

Only connection references with an existing or imminent consumer are created. An
unused connection reference still has to be bound at every import and gives the
deployer no way to know it is irrelevant.

| Connection reference | Connector | Consumers | Created |
| --- | --- | --- | --- |
| HELIOS Dataverse (Maker) | Microsoft Dataverse | F1, F2, F4, F7 | Module 1 Stage 5 |
| HELIOS Dataverse (Service Principal) | Microsoft Dataverse | F5 | Module 1 Stage 6 |
| HELIOS Weather Risk | I1 custom connector | F3, agent weather tool | Module 9 |
| HELIOS Approvals | Approvals | F6 | Module 11 |
| HELIOS Key Vault | Azure Key Vault | F5 | Module 7, Azure track |

Two Dataverse connection references, not one. A connection carries a single
credential, and F5 must act as a service principal while F1, F2, F4 and F7 act as
the maker. G3's one-per-connector rule is a rule about not embedding connections,
not a headcount.

## Decision 4. Deployment settings file for automated import

Interactive import prompts for connections and flows arrive activated. Automated
import by service principal has no prompt, so connection references arrive unset
and dependent flows arrive deactivated. The mitigation is a deployment settings
file mapping connection references to existing target connections and environment
variables to values, supplied to the import step. Generated with
pac solution create-settings. Exact syntax confirmed at Module 11.

Community sources also report that automated redeployment deactivates flows again
even after manual wiring, and that a service principal cannot turn flows on. That
behaviour predates the deployment settings file and has not been verified against
the current platform. Tested empirically in Module 11 rather than assumed.

## Alternatives rejected

Letting the flow designer create connection references implicitly. Rejected on
naming and on cross-solution binding.

Pre-creating all five connection references in Module 1 to satisfy G3 literally.
Rejected: unused references add import friction with no benefit.

A single Dataverse connection reference shared by all flows including F5. Rejected:
a connection carries one credential and F5 must run as a service principal.

## Consequences

Connections are owned by an identity. On this single-identity tenant the maker and
the service account are the same principal and the distinction is invisible. It is
not invisible in production, where a departing owner deactivates every dependent
flow. Stage 6 introduces the service principal that makes this visible.

OAuth connections can only be explicitly shared with a user representing a service
principal, not with an ordinary user. This constrains who can activate flows after
an automated deployment.

Ownership of a connection reference cannot be transferred from the modern Solutions
area. Only the classic solution explorer can change its privileges.

Canvas apps do not recognise connection references on custom connectors. After
import the app must be edited to remove and re-add the custom connector connection,
and if the app is in a managed solution that edit creates an unmanaged layer.
Relevant to C4 in Module 9.

## References

- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-connection-reference
- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/import-update-export-solutions
