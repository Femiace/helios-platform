# ADR-011: Client-side logic placement on Outage Event Main

Status: Accepted
Date: 2026-09-16
Module: M3

## Context

Module 3 implemented the same category of rule at three client layers on the
Outage Event main form: a business rule, a form script, and command bar
buttons. Specification Section 4.2 requires every placement decision to be
recorded with the alternatives rejected.

## Decisions

1. Locking on closure is a business rule, Lock closed outage, All Forms scope.
   Declarative, visible to any maker, no code. Business rules run before the
   form OnLoad, so nothing in the script depends on the lock state.

2. Impact validation is form script. A control notification on Customers
   Affected blocks the save when the value is zero or less. A form
   notification warns when a Critical outage claims fewer customers than the
   threshold. The threshold is read from hel_compliancerule, rule key
   CriticalCustomers, at load, with a fallback of 10,000 if the read fails.

3. Handler registration. Designer registration, stored in the form XML, for
   OnLoad, OnSave and Customers Affected OnChange. Code registration inside
   OnLoad for Severity OnChange and Grid Asset PreSearch. PreSearch has no
   designer equivalent. Severity was kept in code deliberately so the two
   approaches sit side by side on one form.

4. Save control. OnSave calls preventDefault when Severity is Critical and
   Estimated Restoration is empty. This also cancels auto-save. The server
   side equivalent arrives as P2 in Module 6; the client rule is a
   convenience and is never the only enforcement.

5. Lookup filtering. addCustomFilter inside addPreSearch removes Retired
   assets from the Grid Asset lookup. Server side enforcement of retirement
   is P1 in Module 6.

6. Dispatch Board access has two routes on purpose. The Power Fx command
   Navigate opens the page as a full page with no record context, the board
   view. The JavaScript navigateTo opens it as a centred dialog with
   recordId, the record view, and refreshes the Work Orders grid on close.

7. P4 contract, agreed here so Module 6 implements to it:
   hel_ReleaseWorkOrderBatch, unbound action.
   Request: OutageId Edm.Guid required; WorkOrderIds Edm.String, comma
   separated, empty means every Draft work order on the outage.
   Response: ReleasedCount Edm.Int32.
   The client request is complete; settings.p4Enabled stays false until
   Module 6 flips it.

8. Commands are modern, app scoped, with Power Fx visibility rules.
   Mark SLA Breached: Power Fx, Confirm then Patch then Notify.
   Release Work Orders: JavaScript with PrimaryControl, visible only for open
   Critical outages.
   Open Dispatch Board: Power Fx Navigate.

## Alternatives rejected

- Business rule for the impact validation. Rejected. Business rules cannot
  read another table, and Entity scope rules cannot lock or show
  notifications on a control.
- Classic ribbon commands. Rejected. Table wide, ribbon XML, no Power Fx.
- Threshold in an environment variable. Rejected. It is business
  configuration that operators must be able to change, so it lives in a
  table with a form.
- Everything in JavaScript. Rejected. The lock rule needs no code and a
  maker should be able to see it without opening a file.

## Consequences

- Every client rule here is bypassed by an API write until Module 6 adds
  P1 and P2. Document 01 Section 4.2 says client logic is never the only
  enforcement; this ADR is the reminder.
- Modern commands must be recreated for any other app on the table.
- The Severity handler does not appear in the form designer. Anyone
  removing hel_outageForm.js from the form loses it silently.
- hel_outageForm.js is edited in src\webresources and uploaded. The copy
  under solutions\HELIOSExperience\WebResources is export output only.
  