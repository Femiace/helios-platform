// HELIOS C6: Outage Event Main form script
// Module 3, Stage 9. Complete apart from settings.p4Enabled, which Module 6
// flips to true once hel_ReleaseWorkOrderBatch is deployed.
//
// Handlers registered in the form designer:
//   Form OnLoad                     Hel.OutageForm.onLoad
//   Form OnSave                     Hel.OutageForm.onSave
//   Customers Affected OnChange     Hel.OutageForm.onCustomersAffectedChange
// Registered in code inside onLoad:
//   Severity OnChange               Hel.OutageForm.onSeverityChange
//   Grid Asset PreSearch            Hel.OutageForm.filterAssetLookup
// Called from Stage 10 commands with PrimaryControl:
//   Hel.OutageForm.openDispatchBoard
//   Hel.OutageForm.releaseWorkOrders

var Hel = window.Hel || {};
Hel.OutageForm = Hel.OutageForm || {};

(function (ns) {
    "use strict";

    // Choice values from the Module 2 metadata
    var SEVERITY_CRITICAL = 100000003;
    var ASSET_STATUS_RETIRED = 100000003;

    var FORM_TYPE = { CREATE: 1, UPDATE: 2 };

    // Values returned by executionContext.getEventArgs().getSaveMode()
    var SAVE_MODE = { SAVE: 1, SAVE_AND_CLOSE: 2, SAVE_AND_NEW: 59, AUTOSAVE: 70 };

    // Stage 7 custom page and the Module 6 custom API
    var DISPATCH_PAGE_NAME = "hel_heliosdispatchboard_3214c";
    var P4_MESSAGE_NAME = "hel_ReleaseWorkOrderBatch";

    // Runtime settings. Exposed on the namespace so they can be changed from
    // the console during testing without re-uploading the file.
    ns.settings = {
        p4Enabled: false,        // Module 6 changes this default to true
        criticalFloor: 10000     // fallback if the compliance rule read fails
    };

    // Every notification needs a unique id so it can be cleared later
    var IDS = {
        loaded: "hel_outage_loaded",
        impact: "hel_outage_impact",
        customers: "hel_outage_customers",
        saveBlocked: "hel_outage_saveblocked",
        p4: "hel_outage_p4"
    };

    // -----------------------------------------------------------------------
    // Form OnLoad. Designer, execution context passed.
    // -----------------------------------------------------------------------
    ns.onLoad = function (executionContext) {
        var formContext = executionContext.getFormContext();

        // Code registration: invisible in the designer, lives only while the form is open
        var severity = formContext.getAttribute("hel_severity");
        if (severity) {
            severity.addOnChange(ns.onSeverityChange);
        }

        // addCustomFilter is only honoured inside an addPreSearch handler
        var assetControl = formContext.getControl("hel_asset");
        if (assetControl) {
            assetControl.addPreSearch(ns.filterAssetLookup);
        }

        if (formContext.ui.getFormType() === FORM_TYPE.CREATE) {
            formContext.ui.setFormNotification(
                "New outage. Severity and Customers Affected are checked as you type.",
                "INFO",
                IDS.loaded);
        } else {
            formContext.ui.clearFormNotification(IDS.loaded);
        }

        ns.loadCriticalFloor(formContext);
        ns.validateImpact(formContext);
    };

    // -----------------------------------------------------------------------
    // Read the critical customer threshold from the compliance rule table.
    // Asynchronous: the form carries on loading and the threshold arrives a
    // moment later, at which point validation runs again with the real value.
    // If the read fails for any reason the fallback in settings stands and a
    // warning goes to the console, never to the user.
    // -----------------------------------------------------------------------
    ns.loadCriticalFloor = function (formContext) {
        var query = "?$select=hel_thresholdvalue&$filter=hel_rulekey eq 'CriticalCustomers'&$top=1";

        Xrm.WebApi.online.retrieveMultipleRecords("hel_compliancerule", query).then(
            function (result) {
                if (result.entities.length === 1 && result.entities[0].hel_thresholdvalue !== null) {
                    ns.settings.criticalFloor = Number(result.entities[0].hel_thresholdvalue);
                    ns.validateImpact(formContext);
                } else {
                    console.warn("HELIOS: no CriticalCustomers compliance rule found. Using fallback " + ns.settings.criticalFloor);
                }
            },
            function (error) {
                console.warn("HELIOS: compliance rule read failed. Using fallback " + ns.settings.criticalFloor + ". " + error.message);
            });
    };

    // -----------------------------------------------------------------------
    // Form OnSave. Designer, execution context passed.
    // preventDefault stops this save, whatever triggered it, including
    // auto-save. The record stays dirty and the user sees why.
    // -----------------------------------------------------------------------
    ns.onSave = function (executionContext) {
        var formContext = executionContext.getFormContext();
        var eventArgs = executionContext.getEventArgs();
        var saveMode = eventArgs.getSaveMode();

        console.log("HELIOS: outage save requested, save mode " + saveMode +
            (saveMode === SAVE_MODE.AUTOSAVE ? " (auto-save)" : ""));

        var severityAttr = formContext.getAttribute("hel_severity");
        var etaAttr = formContext.getAttribute("hel_estimatedrestoration");
        if (!severityAttr || !etaAttr) {
            return;
        }

        if (severityAttr.getValue() === SEVERITY_CRITICAL && etaAttr.getValue() === null) {
            eventArgs.preventDefault();
            formContext.ui.setFormNotification(
                "A Critical outage cannot be saved without an Estimated Restoration.",
                "ERROR",
                IDS.saveBlocked);
            var etaControl = formContext.getControl("hel_estimatedrestoration");
            if (etaControl) {
                etaControl.setFocus();
            }
            return;
        }

        formContext.ui.clearFormNotification(IDS.saveBlocked);
    };

    // -----------------------------------------------------------------------
    // Customers Affected OnChange. Designer.
    // -----------------------------------------------------------------------
    ns.onCustomersAffectedChange = function (executionContext) {
        ns.validateImpact(executionContext.getFormContext());
    };

    // -----------------------------------------------------------------------
    // Severity OnChange. Code, see onLoad.
    // -----------------------------------------------------------------------
    ns.onSeverityChange = function (executionContext) {
        ns.validateImpact(executionContext.getFormContext());
    };

    // -----------------------------------------------------------------------
    // Shared validation. Control notification blocks save, form notification
    // does not.
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

        if (customers !== null && customers <= 0) {
            customersCtrl.setNotification(
                "Customers Affected must be greater than zero.",
                IDS.customers);
        } else {
            customersCtrl.clearNotification(IDS.customers);
        }

        if (severity === SEVERITY_CRITICAL && customers !== null && customers < ns.settings.criticalFloor) {
            formContext.ui.setFormNotification(
                "Critical outages normally affect " + ns.settings.criticalFloor.toLocaleString() +
                " or more customers. Check Severity or Customers Affected.",
                "WARNING",
                IDS.impact);
        } else {
            formContext.ui.clearFormNotification(IDS.impact);
        }
    };

    // -----------------------------------------------------------------------
    // Grid Asset lookup filter, inside the lookup's pre-search event.
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

    // -----------------------------------------------------------------------
    // Dispatch Board as a centred dialog.
    // openDispatchBoard is the command entry point: it receives the form as
    // PrimaryControl, opens the dialog, and refreshes the Work Orders grid
    // once the dialog closes so an assignment made inside it shows at once.
    // openDispatchBoardById is the same navigation with no form dependency,
    // which is what makes it testable from the console.
    // -----------------------------------------------------------------------
    ns.openDispatchBoard = function (primaryControl) {
        var formContext = primaryControl;
        var outageId = ns.cleanId(formContext.data.entity.getId());

        return ns.openDispatchBoardById(outageId).then(function () {
            var grid = formContext.getControl("subgrid_workorders");
            if (grid) {
                grid.refresh();
            }
        });
    };

    ns.openDispatchBoardById = function (outageId) {
        var pageInput = {
            pageType: "custom",
            name: DISPATCH_PAGE_NAME,
            entityName: "hel_outage",
            recordId: outageId
        };
        var navigationOptions = {
            target: 2,                          // 2 = dialog, 1 = inline
            position: 1,                        // 1 = centred, 2 = side pane
            width: { value: 70, unit: "%" },
            height: { value: 80, unit: "%" },
            title: "HELIOS Dispatch Board"
        };
        return Xrm.Navigation.navigateTo(pageInput, navigationOptions);
    };

    // -----------------------------------------------------------------------
    // P4 hel_ReleaseWorkOrderBatch through Xrm.WebApi.online.execute.
    // releaseWorkOrders is the command entry point. releaseWorkOrdersById
    // builds and sends the request. The request object is complete now; the
    // only thing missing is the message itself, which Module 6 deploys.
    //
    // Contract agreed with Module 6:
    //   Request   OutageId      Edm.Guid    required
    //             WorkOrderIds  Edm.String  comma separated, empty means every Draft work order on the outage
    //   Response  ReleasedCount Edm.Int32
    // -----------------------------------------------------------------------
    ns.releaseWorkOrders = function (primaryControl) {
        var formContext = primaryControl;
        var outageId = ns.cleanId(formContext.data.entity.getId());

        return ns.releaseWorkOrdersById(outageId, "").then(function (releasedCount) {
            if (releasedCount === null) {
                return;
            }
            formContext.ui.setFormNotification(
                releasedCount + " work order(s) released.",
                "INFO",
                IDS.p4);
            var grid = formContext.getControl("subgrid_workorders");
            if (grid) {
                grid.refresh();
            }
        });
    };

    ns.releaseWorkOrdersById = function (outageId, workOrderIds) {
        if (!ns.settings.p4Enabled) {
            return Xrm.Navigation.openAlertDialog({
                title: "Not deployed yet",
                text: P4_MESSAGE_NAME + " arrives in Module 6. The request is built and waiting behind settings.p4Enabled."
            }).then(function () {
                return null;
            });
        }

        var request = {
            OutageId: outageId,
            WorkOrderIds: workOrderIds || "",
            getMetadata: function () {
                return {
                    boundParameter: null,       // null = unbound, a global custom API
                    parameterTypes: {
                        OutageId: { typeName: "Edm.Guid", structuralProperty: 1 },
                        WorkOrderIds: { typeName: "Edm.String", structuralProperty: 1 }
                    },
                    operationType: 0,           // 0 = action, 1 = function, 2 = CRUD
                    operationName: P4_MESSAGE_NAME
                };
            }
        };

        return Xrm.WebApi.online.execute(request)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("HTTP " + response.status + " from " + P4_MESSAGE_NAME);
                }
                return response.json();
            })
            .then(function (body) {
                return body.ReleasedCount;
            })
            .catch(function (error) {
                Xrm.Navigation.openErrorDialog({ message: error.message });
                return null;
            });
    };

    // getId() returns the id wrapped in braces. Param() and the Web API want it bare.
    ns.cleanId = function (id) {
        return (id || "").replace(/[{}]/g, "");
    };

})(Hel.OutageForm);