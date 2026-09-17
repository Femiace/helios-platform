# Logic placement

Every business rule in HELIOS, the mechanism chosen to implement it, and the
alternatives rejected. Populated from Module 3 onward.

Source table: specification Section 4.2.
## Module 3 additions

| Requirement | Chosen mechanism | Why not the alternatives |
| --- | --- | --- |
| Lock asset and start time once an outage is closed | Business rule, All Forms scope | No code needed; visible to makers; runs before OnLoad. An Entity scope rule cannot lock |
| Block save when Customers Affected is zero or less | Form script, control setNotification | Business rules cannot block a save with a field level message. Server rule arrives as P2 |
| Warn when a Critical outage claims fewer than the threshold | Form script, form notification, threshold read from hel_compliancerule | Business rules cannot read another table. Warning must not block |
| Block save of a Critical outage without Estimated Restoration | Form script OnSave preventDefault | Only client mechanism that can cancel a save including auto-save. P2 duplicates it server side |
| Keep Retired assets out of the outage lookup | Form script addCustomFilter in addPreSearch | No declarative equivalent. P1 enforces retirement server side |
| Mark SLA breach from the command bar | Power Fx command with Confirm, Patch, Notify | No JavaScript needed; visibility rule in the same language |
| Release work orders atomically | JavaScript command calling P4 via execute | Needs a transaction; a flow cannot roll back. Client only calls, never implements |
| Open the Dispatch Board with record context | JavaScript navigateTo dialog | Power Fx Navigate from a command passes no record |
