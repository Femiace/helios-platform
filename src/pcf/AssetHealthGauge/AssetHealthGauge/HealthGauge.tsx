   import * as React from "react";
   import { Label, Slider, Text, SliderOnChangeData } from "@fluentui/react-components";

   export type HealthBand = "good" | "warning" | "critical" | "unknown";

   export interface IHealthGaugeProps {
       value: number | null;
       formattedValue: string;
       warningThreshold: number;
       criticalThreshold: number;
       band: HealthBand;
       bandColor: string;
       trackColor: string;
       textColor: string;
       label: string;
       userName: string;
       disabled: boolean;
       allocatedWidth: number;
       onValueChange: (newValue: number) => void;
   }

   const BAND_TEXT: Record<HealthBand, string> = {
       good: "Good",
       warning: "Warning",
       critical: "Critical",
       unknown: "No value"
   };

   export const HealthGauge = (props: IHealthGaugeProps): React.ReactElement => {
       const clamped = props.value === null ? 0 : Math.max(0, Math.min(100, props.value));

       // Geometry of a half-circle arc, drawn left to right across a 200 by 110 box.
       const radius = 80;
       const cx = 100;
       const cy = 100;
       const arcLength = Math.PI * radius;
       const filledLength = (clamped / 100) * arcLength;
       const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

       const maxWidth = props.allocatedWidth > 0 ? Math.min(props.allocatedWidth, 360) : 360;

       const handleChange = (_event: unknown, data: SliderOnChangeData): void => {
           props.onValueChange(data.value);
       };

       return (
           <div style={{ width: "100%", maxWidth: maxWidth }}>
               <Label weight="semibold">{props.label}</Label>
               <svg
                   viewBox="0 0 200 110"
                   role="img"
                   aria-label={`${props.label} ${props.formattedValue}`}
                   style={{ width: "100%", display: "block" }}
               >
                   <path d={arcPath} fill="none" stroke={props.trackColor} strokeWidth={16} strokeLinecap="round" />
                   <path
                       d={arcPath}
                       fill="none"
                       stroke={props.bandColor}
                       strokeWidth={16}
                       strokeLinecap="round"
                       strokeDasharray={`${filledLength} ${arcLength}`}
                   />
                   <text x={cx} y={cy - 12} textAnchor="middle" fontSize="30" fontWeight="600" fill={props.textColor}>
                       {props.value === null ? "--" : props.formattedValue}
                   </text>
                   <text x={cx} y={cy + 6} textAnchor="middle" fontSize="12" fill={props.bandColor}>
                       {BAND_TEXT[props.band]}
                   </text>
               </svg>
               <Slider
                   min={0}
                   max={100}
                   step={1}
                   value={clamped}
                   disabled={props.disabled}
                   onChange={handleChange}
                   aria-label={props.label}
               />
               <Text size={200}>
                   Warning below {props.warningThreshold}, critical below {props.criticalThreshold}. Viewed by{" "}
                   {props.userName || "unknown user"}.
               </Text>
           </div>
       );
   };
   