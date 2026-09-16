// HELIOS C6: Outage Event Main form script
// Module 3, Stage 8. Stage 9 adds onSave, the P4 call and the Dispatch Board dialog.
//
// Namespace pattern: everything hangs off Hel.OutageForm so nothing here can
// collide with another library loaded on the same form. Handler names given to
// the form designer are therefore Hel.OutageForm.onLoad and
// Hel.OutageForm.onCustomersAffectedChange.

var Hel = window.Hel || {};
Hel.OutageForm = Hel.OutageForm || {};

(function (ns) {
    "use strict";

    // Choice values from the Module 2 metadata. Severity is the global hel_severity choice.
    var SEVERITY_CRITICAL = 100000003;
    var ASSET_STATUS_RETIRED = 100000003;

    // Stage 9 replaces this constant with a Web API read of hel_compliancerule.
    var CRITICAL_CUSTOMER_FLOOR = 10000;

    // Form types returned by formContext.ui.getFormType()
    var FORM_TYPE = { CREATE: 1, UPDATE: 2 };

    // Every notification needs a unique id so it can be cleared later
    var IDS = {
        loaded: "hel_outage_loaded",
        impact: "hel_outage_impact",
        customers: "hel_outage_customers"
    };

    // -----------------------------------------------------------------------
    // Form OnLoad. Registered in the designer with execution context passed.
    // -----------------------------------------------------------------------
    ns.onLoad = function (executionContext) {
        var formContext = executionContext.getFormContext();

        // Registration in code. This handler exists only while the form is open
        // and is invisible in the form designer. Compare with the Customers
        // Affected handler, which is registered in the designer and stored in
        // the form XML.
        var severity = formContext.getAttribute("hel_severity");
        if (severity) {
            severity.addOnChange(ns.onSeverityChange);
        }

        // addCustomFilter may only be called inside an addPreSearch handler.
        // The handler runs every time the lookup opens its search results.
        var assetControl = formContext.getControl("hel_asset");
        if (assetControl) {
            assetControl.addPreSearch(ns.filterAssetLookup);
        }

        // Form-level notification, INFO level, does not block anything.
        if (formContext.ui.getFormType() === FORM_TYPE.CREATE) {
            formContext.ui.setFormNotification(
                "New outage. Severity and Customers Affected are checked as you type.",
                "INFO",
                IDS.loaded);
        } else {
            formContext.ui.clearFormNotification(IDS.loaded);
        }

        // Validate whatever the record already holds, so an existing bad
        // record is flagged on open and not only after an edit.
        ns.validateImpact(formContext);
    };

    // -----------------------------------------------------------------------
    // Customers Affected OnChange. Registered in the DESIGNER.
    // -----------------------------------------------------------------------
    ns.onCustomersAffectedChange = function (executionContext) {
        ns.validateImpact(executionContext.getFormContext());
    };

    // -----------------------------------------------------------------------
    // Severity OnChange. Registered in CODE, see onLoad.
    // -----------------------------------------------------------------------
    ns.onSeverityChange = function (executionContext) {
        ns.validateImpact(executionContext.getFormContext());
    };

    // -----------------------------------------------------------------------
    // Shared validation. Two levels on purpose:
    //   control notification  = data is invalid, save is blocked
    //   form notification     = data is suspicious, save is allowed
    // -----------------------------------------------------------------------
    ns.validateImpact = function (formContext) {
        var customersAttr = formContext.getAttribute("hel_customersaffected");
        var severityAttr = formContext.getAttribute("hel_severity");
        var customersCtrl = formContext.getControl("hel_customersaffected");

        if (!customersAttr || !severityAttr || !customersCtrl) {
            return;
        }

        var customers = customersAttr.getValue();
        var severity = severityAttr.getValue();

        // Hard rule. setNotification puts a red marker on the control and
        // blocks the form from saving until clearNotification is called with
        // the same id.
        if (customers !== null && customers <= 0) {
            customersCtrl.setNotification(
                "Customers Affected must be greater than zero.",
                IDS.customers);
        } else {
            customersCtrl.clearNotification(IDS.customers);
        }

        // Soft rule. A WARNING form notification is advisory only.
        if (severity === SEVERITY_CRITICAL && customers !== null && customers < CRITICAL_CUSTOMER_FLOOR) {
            formContext.ui.setFormNotification(
                "Critical outages normally affect " + CRITICAL_CUSTOMER_FLOOR.toLocaleString() +
                " or more customers. Check Severity or Customers Affected.",
                "WARNING",
                IDS.impact);
        } else {
            formContext.ui.clearFormNotification(IDS.impact);
        }
    };

    // -----------------------------------------------------------------------
    // Grid Asset lookup filter. Runs inside the lookup's pre-search event.
    // The filter is a FetchXML <filter> element applied on top of the lookup
    // view's own filter. Retired assets cannot be attached to a new outage.
    // -----------------------------------------------------------------------
    ns.filterAssetLookup = function (executionContext) {
        var formContext = executionContext.getFormContext();
        var assetControl = formContext.getControl("hel_asset");
        if (!assetControl) {
            return;
        }

        var filter =
            "<filter type='and'>" +
            "<condition attribute='hel_status' operator='ne' value='" + ASSET_STATUS_RETIRED + "' />" +
            "</filter>";

        assetControl.addCustomFilter(filter, "hel_asset");
    };

})(Hel.OutageForm);