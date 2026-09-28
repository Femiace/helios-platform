# Module 3 recap: the twelve ideas

1. Where things run. The browser assembles every form from a form definition plus
   the record's data. Everything built in Module 3 runs in the browser and only
   while a person has the form open. A flow, an integration, a script or a canvas
   Patch never opens the form, so none of these rules apply to them. Storage is
   not execution: the business rule is stored in Dataverse and runs in the browser.

2. Events and handlers. A form raises OnLoad, OnChange per column, and OnSave.
   A handler is a function run at that moment. Designer registration is written
   into the form definition and travels with the form. Code registration with
   addOnChange or addPreSearch exists only while the form is open and travels
   with the script. Execution context is the parcel a handler receives; the
   designer only passes it if the checkbox is ticked.

3. Attribute versus control. The attribute is the value; the control is the box.
   One value can have several boxes, such as the body and the header. Values,
   change handlers and required levels are on the attribute. Visibility, disabled
   state, notifications and lookup filters are on the control.

4. Notifications and blocking. Only two things stop a save: a control marked with
   setNotification, because the form never saves an invalid box, and
   preventDefault on the OnSave event arguments. Banners, dialogs and Notify are
   messages at any level, including ERROR. Auto-save is save mode 70 and is
   cancelled by preventDefault like any other save.

5. Lookups. A lookup stores a reference, seen in the Web API as _hel_asset_value
   and in code as an array of one object with id, name and entityType. The box
   raises a pre-search event before it queries; addCustomFilter only works inside
   an addPreSearch handler, using FetchXML, and shapes the list, not the column.

6. Business rules. Declarative conditions and actions, stored as a workflow of
   category 2. Scope decides where it runs: form scopes are browser only, Entity
   scope also runs on the server but only for set value, set default, clear and
   show error. Lock, hide and require are box properties and exist only at form
   scope. Conditions cannot read another table. Editable grids and multi-select
   choices are excluded.

7. The Web API from the browser. Xrm.WebApi.online.retrieveMultipleRecords takes a
   table logical name and an OData query and returns a promise. execute takes a
   request object whose getMetadata names the message: boundParameter null for an
   unbound message, operationType 0 for an action, parameterTypes describing each
   input. "Resource not found for the segment" means the message name is not in
   the server's metadata yet.

8. Custom pages and navigation. A custom page is a canvas app of type 2 living
   inside the model-driven app. Xrm.Navigation.navigateTo with pageType custom
   takes the logical name, target 1 inline or 2 dialog, position 1 centred or 2
   side. recordId arrives as Param("recordId") and must be a GUID. Back() closes
   a dialog and resolves the promise. Power Fx Navigate(page) from a command
   opens the page without record context.

9. Commands. Modern commands are App Action rows scoped to one app, built in the
   command designer. Power Fx commands use Self.Selected.Item with Patch, Confirm
   and Notify. JavaScript commands name a library, a function and PrimaryControl.
   Visibility is a Power Fx formula. The formulas live in a command component
   library, canvas app type 1. Classic ribbon commands are table wide and XML.

10. Solutions and dependencies. A form records a dependency on any code component
    it hosts. Forms sit in HELIOSExperience because Module 4's code components
    sit there too; a form in HELIOSCore hosting one would make Core depend on
    Experience and break the import order. Tables added with nothing selected
    travel as shells, rootcomponentbehavior 2. Views are type 26, forms 60, web
    resources 61, business rules 29, sitemap 62, app 80, canvas apps 300.

11. Security on the form. An access team is created per record on first
    membership, carries no roles, and grants the template's rights on that record
    only; yours grants Read, Write and Append To. The subgrid works only with the
    User table and the Associated Record Team Members view. Owner teams carry
    roles and own records. Column security makes Compensation Due read only for
    ordinary users; the form's Read-only tick makes the screen honest.

12. Client versus server. Every Module 3 rule is convenience for the person at
    the form and is bypassed by every other writer. Module 6 puts the real rules
    in plug-ins: PreValidation to reject, PreOperation to derive values into the
    Target, PostOperation asynchronously for work that does not need the
    transaction. Client logic is never the only enforcement.
    