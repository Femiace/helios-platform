   import { IInputs } from "./generated/ManifestTypes";

   // One inspection row, already shaped for display.
   export interface IInspectionRow {
       id: string;
       name: string;
       dateText: string;
       resultingHealth: number | null;
   }

   // A second asset chosen for comparison.
   export interface IComparisonAsset {
       id: string;
       name: string;
       serialNumber: string;
       healthIndex: number | null;
   }

   // Which platform features this host actually provides. All three are declared
   // required="false" in the manifest, so each may be missing at runtime.
   export interface IHostCapabilities {
       webApi: boolean;
       lookup: boolean;
       barcode: boolean;
   }

   const LOG = "[AssetHealthGauge.services]";

   // Reads values out of Web API records without trusting their shape.
   function asString(value: unknown): string {
       return typeof value === "string" ? value : "";
   }

   function asNumberOrNull(value: unknown): number | null {
       return typeof value === "number" ? value : null;
   }

   function stripBraces(id: string): string {
       return id.replace(/[{}]/g, "");
   }

   export class PlatformServices {
       private context: ComponentFramework.Context<IInputs>;

       constructor(context: ComponentFramework.Context<IInputs>) {
           this.context = context;
       }

       // The platform hands a fresh context to every updateView. Keep the latest one.
       public update(context: ComponentFramework.Context<IInputs>): void {
           this.context = context;
       }

       public getCapabilities(): IHostCapabilities {
           const c = this.context;
           const webApi = typeof c.webAPI?.retrieveMultipleRecords === "function";
           const lookup = typeof c.utils?.lookupObjects === "function";
           const barcode = typeof c.device?.getBarcodeValue === "function";
           console.log(`${LOG} capabilities`, { webApi, lookup, barcode });
           return { webApi, lookup, barcode };
       }

       // context.webAPI.retrieveMultipleRecords: the five most recent inspections for one asset.
       public async loadInspections(assetId: string): Promise<IInspectionRow[]> {
           const id = stripBraces(assetId);
           const query =
               "?$select=hel_name,hel_inspectiondate,hel_resultinghealthindex" +
               `&$filter=_hel_asset_value eq ${id}` +
               "&$orderby=hel_inspectiondate desc&$top=5";
           console.log(`${LOG} retrieveMultipleRecords`, { entity: "hel_inspection", query });

           const response = await this.context.webAPI.retrieveMultipleRecords("hel_inspection", query);
           const rows: IInspectionRow[] = response.entities.map((entity) => {
               const record: Record<string, unknown> = entity;
               const rawDate = asString(record.hel_inspectiondate);
               return {
                   id: asString(record.hel_inspectionid),
                   name: asString(record.hel_name),
                   dateText: rawDate === "" ? "" : this.context.formatting.formatDateShort(new Date(rawDate)),
                   resultingHealth: asNumberOrNull(record.hel_resultinghealthindex)
               };
           });
           console.log(`${LOG} inspections loaded`, { count: rows.length });
           return rows;
       }

       // context.utils.lookupObjects then context.webAPI.retrieveRecord: pick another asset and read it.
       public async pickComparisonAsset(): Promise<IComparisonAsset | null> {
           console.log(`${LOG} lookupObjects`, { entityTypes: ["hel_asset"] });
           const chosen = await this.context.utils.lookupObjects({
               entityTypes: ["hel_asset"],
               allowMultiSelect: false
           });
           if (chosen.length === 0) {
               console.log(`${LOG} lookup cancelled`);
               return null;
           }
           const id = stripBraces(chosen[0].id);
           console.log(`${LOG} retrieveRecord`, { entity: "hel_asset", id });
           const record: Record<string, unknown> = await this.context.webAPI.retrieveRecord(
               "hel_asset",
               id,
               "?$select=hel_name,hel_serialnumber,hel_healthindex"
           );
           return {
               id: id,
               name: asString(record.hel_name),
               serialNumber: asString(record.hel_serialnumber),
               healthIndex: asNumberOrNull(record.hel_healthindex)
           };
       }

       // context.device.getBarcodeValue: only the mobile app can fulfil this.
       public async scanBarcode(): Promise<string> {
           console.log(`${LOG} getBarcodeValue`);
           const value = await this.context.device.getBarcodeValue();
           console.log(`${LOG} barcode scanned`, { value });
           return value;
       }
   }
   