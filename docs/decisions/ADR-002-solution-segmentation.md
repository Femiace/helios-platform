# ADR-002. Solution segmentation, boundaries and dependency direction

Status: Accepted.
Date: Module 1, Stage 3.

## Context

HELIOS is split across five unmanaged solutions in DEV, deployed as five managed
solutions into TEST. The number is fixed by the specification. The boundaries,
the ownership rules and the dependency direction are not, and are decided here.

Two distinct concepts share the word segmentation. Microsoft uses it for table
segmentation, meaning the inclusion of selected table assets rather than whole
tables. The specification uses it for multi-solution architecture. Both apply to
this build and they are recorded separately below.

## Decision 1. Segmentation axis

Horizontal, by technical layer: Core, Logic, Automation, Agent, Experience.

## Decision 2. Dependency direction

A single linear chain, no backward edges.

Core -> Logic -> Automation -> Agent -> Experience

Import order into any target environment is that order. Export order is irrelevant.

## Decision 3. Component ownership

Exactly one owning solution per component. Components are not added to a second
solution in DEV even though unmanaged solutions permit it, because a component
introduced by two managed solutions creates an unintended layering situation in
the target.

| Solution | Owns |
| --- | --- |
| Core | Standard, elastic, virtual and activity tables, relationships, alternate keys, change tracking, global choices, security roles, column security profiles |
| Logic | P1-P3 plug-ins, P4-P5 custom APIs, P6 Power Fx function, P7 event catalog, P8 service endpoint, P9 managed identity plug-in |
| Automation | F1-F7 cloud flows, connection references, I1 custom connector |
| Agent | A1 agent, agent flows, Compliance Checker child agent |
| Experience | C1-C2 code components, C3 library, C4 canvas app, C5 model-driven app, C6 web resource, C7 commands, C8 custom page, custom forms and views |
| None | I2-I5 Azure Functions and console apps. Not Dataverse components |

## Decision 4. Table segmentation policy

First deployment of any table uses Include all objects, because the table does not
yet exist in the target and partial inclusion produces a missing dependency error
on import. From the second deployment onward, updates use Edit objects and include
only changed assets.

Custom forms and views authored for the model-driven app in Module 3 are added to
Experience by segmentation from Core's tables, not by moving the table.

## Decision 5. Non-solution-aware configuration

Business units and teams are records, not solution components, and must be created
by hand or by configuration data deployment in every environment. Security roles
and column security profiles are solution components; their user and team
assignments are not.

## Reasoning

Horizontal segmentation was chosen because schema, server logic and user experience
change on different cadences and the resulting cross-solution dependency edges are
the examinable content in this build. It costs cohesion: a single business feature
change touches up to four solutions.

Security roles sit in Core with the tables whose privileges they grant, to keep all
edges pointing away from Core. Custom API ExecutePrivilegeName references an
existing privilege rather than creating one, so no backward edge from Core to Logic
is introduced.

The Experience to Agent edge does not exist at Module 5 when the canvas app is
built. It appears at Module 8 when the chatbot control is added. Import order is
fixed now so that this late edge does not surface as an unexplained import failure.

## Alternatives rejected

Vertical segmentation by business feature, for example Outage Management and Asset
Management. Rejected because the tables are shared across features, so a shared
base solution would be needed anyway and the result is the hybrid model with more
edges, not fewer.

Hybrid: a shared Core plus vertical feature solutions. The model most large
implementations converge on. Rejected here only because the specification fixes
five solutions on a layer axis.

Adding shared components to more than one solution in DEV for convenience.
Rejected on layering grounds.

## Consequences

Every future component creation begins with the question of which solution owns it,
answered from the ownership table above, before the component is created rather than
after.

Preferred solution is set to HELIOS Core and does not cover chatbots, custom
connectors, or flows fully. Those component types are created from inside their
owning solution explicitly.

## References

- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-solution
- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/preferred-solution
- https://learn.microsoft.com/en-us/power-platform/alm/solution-layers-alm
