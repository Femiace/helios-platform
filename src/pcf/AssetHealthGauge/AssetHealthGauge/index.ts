   import { IInputs, IOutputs } from "./generated/ManifestTypes";
   import { HealthGauge, IHealthGaugeProps, HealthBand } from "./HealthGauge";
   import { IHostCapabilities, PlatformServices } from "./PlatformServices";
   import * as React from "react";

   const LOG = "[AssetHealthGauge]";

   interface IGaugeColours {
       band: string;
       track: string;
       text: string;
   }

   const FALLBACK_BAND: Record<HealthBand, string> = {
       good: "#107C10",
       warning: "#C19C00",
       critical: "#D13438",
       unknown: "#8A8886"
   };

   const TOKEN_FOR_BAND: Record<HealthBand, string> = {
       good: "colorPaletteGreenForeground1",
       warning: "colorPaletteMarigoldForeground1",
       critical: "colorPaletteRedForeground1",
       unknown: "colorNeutralForeground3"
   };

   export class AssetHealthGauge implements ComponentFramework.ReactControl<IInputs, IOutputs> {
       private notifyOutputChanged: () => void;
       private services: PlatformServices;
       private capabilities: IHostCapabilities;
       private currentValue: number | null = null;
       private lastScanResult: string | undefined = undefined;
       private updateCount = 0;

       constructor() {
           console.log(`${LOG} constructor`);
       }

       public init(
           context: ComponentFramework.Context<IInputs>,
           notifyOutputChanged: () => void,
           state: ComponentFramework.Dictionary
       ): void {
           this.notifyOutputChanged = notifyOutputChanged;
           context.mode.trackContainerResize(true);

           // Platform services and capability checks are one-time setup, so they live in init.
           this.services = new PlatformServices(context);
           this.capabilities = this.services.getCapabilities();

           console.log(`${LOG} init`, {
               userName: context.userSettings.userName,
               languageId: context.userSettings.languageId,
               formFactor: context.client.getFormFactor(),
               allocatedWidth: context.mode.allocatedWidth,
               fluentTheme: context.fluentDesignLanguage ? "provided" : "not provided",
               isDarkTheme: context.fluentDesignLanguage?.isDarkTheme ?? false,
               capabilities: this.capabilities,
               restoredState: state
           });
       }

       public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
           this.updateCount += 1;
           this.services.update(context);
           const p = context.parameters;
           this.currentValue = p.healthIndex.raw;

           console.log(`${LOG} updateView #${this.updateCount}`, {
               updatedProperties: context.updatedProperties,
               raw: p.healthIndex.raw,
               formatted: p.healthIndex.formatted,
               assetId: p.assetId.raw,
               serialNumber: p.serialNumber.raw,
               allocatedWidth: context.mode.allocatedWidth,
               allocatedHeight: context.mode.allocatedHeight,
               disabled: context.mode.isControlDisabled
           });

           const warning = p.warningThreshold.raw ?? 60;
           const critical = p.criticalThreshold.raw ?? 40;
           const band = this.getBand(this.currentValue, warning, critical);
           const colours = this.getColours(band, this.readTheme(context));
           const formatted = this.currentValue === null ? "" : context.formatting.formatDecimal(this.currentValue, 1);

           const props: IHealthGaugeProps = {
               value: this.currentValue,
               formattedValue: formatted,
               warningThreshold: warning,
               criticalThreshold: critical,
               band: band,
               bandColor: colours.band,
               trackColor: colours.track,
               textColor: colours.text,
               label: context.mode.label || "Health Index",
               userName: context.userSettings.userName,
               disabled: context.mode.isControlDisabled,
               allocatedWidth: context.mode.allocatedWidth,
               assetId: p.assetId.raw ?? "",
               serialNumber: p.serialNumber.raw ?? "",
               capabilities: this.capabilities,
               services: this.services,
               onValueChange: this.onValueChange,
               onScanResult: this.onScanResult
           };
           return React.createElement(HealthGauge, props);
       }

       public getOutputs(): IOutputs {
           console.log(`${LOG} getOutputs`, { healthIndex: this.currentValue, lastScanResult: this.lastScanResult });
           return {
               healthIndex: this.currentValue ?? undefined,
               lastScanResult: this.lastScanResult
           };
       }

       public destroy(): void {
           console.log(`${LOG} destroy`);
       }

       private onValueChange = (newValue: number): void => {
           console.log(`${LOG} user changed value`, { from: this.currentValue, to: newValue });
           this.currentValue = newValue;
           this.notifyOutputChanged();
       };

       private onScanResult = (result: string): void => {
           console.log(`${LOG} scan result`, { result });
           this.lastScanResult = result;
           this.notifyOutputChanged();
       };

       private getBand(value: number | null, warning: number, critical: number): HealthBand {
           if (value === null) {
               return "unknown";
           }
           if (value < critical) {
               return "critical";
           }
           if (value < warning) {
               return "warning";
           }
           return "good";
       }

       // The platform theme is typed loosely, so it is read as a dictionary of unknown values
       // and each token is checked to be a string before use.
       private readTheme(context: ComponentFramework.Context<IInputs>): Record<string, unknown> | undefined {
           const design = context.fluentDesignLanguage;
           if (!design) {
               return undefined;
           }
           return design.tokenTheme as Record<string, unknown>;
       }

       private getColours(band: HealthBand, theme: Record<string, unknown> | undefined): IGaugeColours {
           if (!theme) {
               return { band: FALLBACK_BAND[band], track: "#E1DFDD", text: "#242424" };
           }
           return {
               band: this.token(theme, TOKEN_FOR_BAND[band], FALLBACK_BAND[band]),
               track: this.token(theme, "colorNeutralStroke2", "#E1DFDD"),
               text: this.token(theme, "colorNeutralForeground1", "#242424")
           };
       }

       private token(theme: Record<string, unknown>, name: string, fallback: string): string {
           const value = theme[name];
           return typeof value === "string" ? value : fallback;
       }
   }
   