import * as React from "react";
import {
    Button,
    FluentProvider,
    Input,
    Label,
    PartialTheme,
    Slider,
    Text,
    SliderOnChangeData,
    InputOnChangeData
} from "@fluentui/react-components";
import { IComparisonAsset, IHostCapabilities, IInspectionRow, PlatformServices } from "./PlatformServices";

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
    theme: PartialTheme;
    assetId: string;
    serialNumber: string;
    capabilities: IHostCapabilities;
    services: PlatformServices;
    onValueChange: (newValue: number) => void;
    onScanResult: (result: string) => void;
}

const BAND_TEXT: Record<HealthBand, string> = {
    good: "Good",
    warning: "Warning",
    critical: "Critical",
    unknown: "No value"
};

type LoadState = "idle" | "loading" | "loaded" | "unavailable" | "error";

const sectionStyle: React.CSSProperties = { marginTop: 12 };
const rowStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" };

export const HealthGauge = (props: IHealthGaugeProps): React.ReactElement => {
    const clamped = props.value === null ? 0 : Math.max(0, Math.min(100, props.value));

    // Geometry of a half-circle arc, drawn left to right across a 200 by 110 box.
    const radius = 80;
    const cx = 100;
    const cy = 100;
    const arcLength = Math.PI * radius;
    const filledLength = (clamped / 100) * arcLength;
    const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

    const maxWidth = props.allocatedWidth > 0 ? Math.min(props.allocatedWidth, 420) : 420;

    // State that belongs to this picture, not to the platform: what has been loaded,
    // what was scanned, what was picked. The platform never sees any of it.
    const [inspections, setInspections] = React.useState<IInspectionRow[]>([]);
    const [inspectionState, setInspectionState] = React.useState<LoadState>("idle");
    const [inspectionError, setInspectionError] = React.useState<string>("");
    const [comparison, setComparison] = React.useState<IComparisonAsset | null>(null);
    const [comparisonError, setComparisonError] = React.useState<string>("");
    const [typedSerial, setTypedSerial] = React.useState<string>("");
    const [scanMessage, setScanMessage] = React.useState<string>("");

    // Runs after the first draw and again whenever the asset id changes.
    React.useEffect(() => {
        if (!props.capabilities.webApi) {
            setInspectionState("unavailable");
            return;
        }
        if (props.assetId === "") {
            setInspectionState("idle");
            setInspections([]);
            return;
        }
        let cancelled = false;
        setInspectionState("loading");
        const load = async (): Promise<void> => {
            try {
                const rows = await props.services.loadInspections(props.assetId);
                if (!cancelled) {
                    setInspections(rows);
                    setInspectionState("loaded");
                }
            } catch (error: unknown) {
                if (!cancelled) {
                    setInspectionError(error instanceof Error ? error.message : String(error));
                    setInspectionState("error");
                }
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [props.assetId, props.capabilities.webApi, props.services]);

    const handleSlider = (_event: unknown, data: SliderOnChangeData): void => {
        props.onValueChange(data.value);
    };

    const handleTypedSerial = (_event: unknown, data: InputOnChangeData): void => {
        setTypedSerial(data.value);
    };

    const compareSerial = (scanned: string): void => {
        const expected = props.serialNumber.trim().toUpperCase();
        const actual = scanned.trim().toUpperCase();
        const result = expected !== "" && expected === actual ? "Match" : "Mismatch";
        setScanMessage(`${result}: scanned ${actual || "(nothing)"}, record has ${expected || "(no serial)"}`);
        props.onScanResult(result);
    };

    const handleScan = (): void => {
        const scan = async (): Promise<void> => {
            try {
                const value = await props.services.scanBarcode();
                compareSerial(value);
            } catch (error: unknown) {
                setScanMessage(`Scan failed: ${error instanceof Error ? error.message : String(error)}. Type the serial instead.`);
            }
        };
        void scan();
    };

    const handlePick = (): void => {
        setComparisonError("");
        const pick = async (): Promise<void> => {
            try {
                const asset = await props.services.pickComparisonAsset();
                setComparison(asset);
            } catch (error: unknown) {
                setComparisonError(error instanceof Error ? error.message : String(error));
            }
        };
        void pick();
    };

    const renderInspections = (): React.ReactElement => {
        switch (inspectionState) {
            case "unavailable":
                return <Text size={200}>Inspection history needs the Web API, which this host does not provide.</Text>;
            case "idle":
                return <Text size={200}>No asset id bound, so no inspection history.</Text>;
            case "loading":
                return <Text size={200}>Loading inspections...</Text>;
            case "error":
                return <Text size={200}>Could not load inspections: {inspectionError}</Text>;
            case "loaded":
                if (inspections.length === 0) {
                    return <Text size={200}>No inspections recorded for this asset.</Text>;
                }
                return (
                    <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
                        {inspections.map((row) => (
                            <li key={row.id}>
                                <Text size={200}>
                                    {row.dateText} {row.name}
                                    {row.resultingHealth === null ? "" : `, health ${row.resultingHealth}`}
                                </Text>
                            </li>
                        ))}
                    </ul>
                );
        }
    };

    return (
        <FluentProvider theme={props.theme} style={{ backgroundColor: "transparent", width: "100%", maxWidth: maxWidth }}>
            <Label weight="semibold">{props.label}</Label>
            <svg
                viewBox="0 0 200 110"
                role="img"
                aria-label={`${props.label} ${props.formattedValue}`}
                style={{ width: "100%", maxWidth: 320, display: "block" }}
            >
                <path d={arcPath} style={{ fill: "none" }} stroke={props.trackColor} strokeWidth={16} strokeLinecap="round" />
                <path
                    d={arcPath}
                    style={{ fill: "none" }}
                    stroke={props.bandColor}
                    strokeWidth={16}
                    strokeLinecap="round"
                    strokeDasharray={`${filledLength} ${arcLength}`}
                />
                <text x={cx} y={cy - 12} textAnchor="middle" fontSize="30" fontWeight="600" style={{ fill: props.textColor }}>
                    {props.value === null ? "--" : props.formattedValue}
                </text>
                <text x={cx} y={cy + 6} textAnchor="middle" fontSize="12" style={{ fill: props.bandColor }}>
                    {BAND_TEXT[props.band]}
                </text>
            </svg>
            <Slider
                min={0}
                max={100}
                step={1}
                value={clamped}
                disabled={props.disabled}
                onChange={handleSlider}
                aria-label={props.label}
            />
            <Text size={200}>
                Warning below {props.warningThreshold}, critical below {props.criticalThreshold}. Viewed by{" "}
                {props.userName || "unknown user"}.
            </Text>

            <div style={sectionStyle}>
                <Label weight="semibold">Recent inspections</Label>
                {renderInspections()}
            </div>

            <div style={sectionStyle}>
                <Label weight="semibold">Confirm serial on site</Label>
                <div style={rowStyle}>
                    <Button appearance="primary" disabled={!props.capabilities.barcode} onClick={handleScan}>
                        Scan barcode
                    </Button>
                    <Input
                        placeholder="Or type the serial"
                        value={typedSerial}
                        onChange={handleTypedSerial}
                        aria-label="Typed serial number"
                    />
                    <Button onClick={() => compareSerial(typedSerial)}>Check</Button>
                </div>
                <Text size={200}>
                    {props.capabilities.barcode
                        ? "Camera scanning is available on this device."
                        : "Camera scanning is only available in the Power Apps mobile app."}
                    {scanMessage === "" ? "" : ` ${scanMessage}`}
                </Text>
            </div>

            <div style={sectionStyle}>
                <Label weight="semibold">Compare with another asset</Label>
                <div style={rowStyle}>
                    <Button disabled={!props.capabilities.lookup || !props.capabilities.webApi} onClick={handlePick}>
                        Pick asset
                    </Button>
                    {comparison === null ? (
                        <Text size={200}>
                            {props.capabilities.lookup ? "No asset picked yet." : "The lookup dialog is not available in this host."}
                        </Text>
                    ) : (
                        <Text size={200}>
                            {comparison.name} ({comparison.serialNumber || "no serial"}): health{" "}
                            {comparison.healthIndex ?? "unknown"}
                            {props.value === null || comparison.healthIndex === null
                                ? ""
                                : `, this asset is ${props.value >= comparison.healthIndex ? "healthier" : "worse"}`}
                        </Text>
                    )}
                </div>
                {comparisonError === "" ? null : <Text size={200}>Could not compare: {comparisonError}</Text>}
            </div>
        </FluentProvider>
    );
};
