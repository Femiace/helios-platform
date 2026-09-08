# ADR-010: Views, forms and UI components live in HELIOSExperience

Status: Accepted
Date: 2026-09-07
Module: M3

## Context

HELIOS uses five segmented solutions on a linear dependency chain:
HELIOSCore, HELIOSLogic, HELIOSAutomation, HELIOSAgent, HELIOSExperience.
A solution may depend only on solutions earlier in the chain.

All thirteen hel_ tables were created in HELIOSCore in Module 2. Module 3 adds
views, main forms, quick view forms, a custom page, a script web resource and
modern commands. Module 4 adds two Power Apps component framework code
components, C1 HeliosNetworkHeatmap and C2 AssetHealthGauge, which will be
hosted on the Grid Asset and Outage Event main forms.

Dataverse records a solution dependency from a form to any code component that
form hosts.

## Decision

Tables, columns, relationships, alternate keys and choices stay in HELIOSCore.

Views, main forms, quick view forms, custom pages, script web resources, modern
commands, the command component library and the model-driven app go in
HELIOSExperience.

Tables are added to HELIOSExperience with no subcomponents and no metadata
selected, so the table travels as a shell only.

## Alternatives rejected

1. Forms and views in HELIOSCore alongside the tables.
   Rejected. In Module 4 a form in HELIOSCore hosting a code component in
   HELIOSExperience would make HELIOSCore depend on HELIOSExperience. That
   reverses the chain and leaves no valid import order into HELIOS TEST.

2. Code components in HELIOSCore so that forms could stay in Core.
   Rejected. A code component is an experience-layer artifact. Putting it in the
   data solution defeats the segmentation this build exists to demonstrate.

3. One unsegmented solution.
   Rejected. Solution dependency management and segmentation are graded PL-400
   objectives in Domain 2.

## Consequences

Positive. The linear chain holds. HELIOSExperience imports cleanly after
HELIOSCore with no circular dependency.

Negative. The maker preferred solution must remain HELIOSExperience for the
duration of Modules 3 to 5. If it reverts to HELIOSCore, new components silently
join the wrong solution.

Negative. Any Module 2 system view or system form edited during Module 3 gains
dual solution membership, because a component already in one unmanaged solution
is still added to the preferred solution. Mitigation: create new views and new
forms rather than editing the Module 2 generated ones.

## Verification

GET /api/data/v9.2/solutioncomponents?$filter=_solutionid_value eq {HELIOSExperience solutionid}

At the end of Module 3 Stage 1 this returns six rows of componenttype 1 with
rootcomponentbehavior other than 0, and no rows of componenttype 2, 26 or 60.
