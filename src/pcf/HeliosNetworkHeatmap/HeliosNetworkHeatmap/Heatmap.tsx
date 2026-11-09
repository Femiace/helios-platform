import * as React from "react";
import { Button, FluentProvider, Label, PartialTheme, Text } from "@fluentui/react-components";
import { IDatasetSnapshot, ITile } from "./DatasetReader";

export type ThemeSource = "host" | "fallback";

export interface IHeatmapProps {
    snapshot: IDatasetSnapshot;
    theme: PartialTheme;
    themeSource: ThemeSource;
    isDarkTheme: boolean;
    allocatedWidth: number;
    allocatedHeight: number;
    selectedId: string | null;
    onSelectTile: (id: string) => void;
    onOpenSelected: () => void;
    onSortHeat: (descending: boolean) => void;
    onSortLabel: () => void;
    onFirstPage: () => void;
    onPreviousPage: () => void;
    onNextPage: () => void;
    onLoadMore: () => void;
    onReload: () => void;
}

// Cool blue for the lowest value on the page, hot red for the highest.
// Hue 210 is blue, hue 0 is red, and everything between is interpolated.
export function heatColour(value: number | null, min: number, max: number): string {
    if (value === null) {
        return "#8A8886";
    }
    const span = max - min;
    const position = span <= 0 ? 0.5 : (value - min) / span;
    const hue = Math.round(210 - 210 * position);
    return `hsl(${hue}, 70%, 42%)`;
}

const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 8,
    marginTop: 8
};

const tileStyle: React.CSSProperties = {
    borderRadius: 4,
    padding: "8px 10px",
    minHeight: 56,
    color: "#FFFFFF",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    overflow: "hidden",
    cursor: "pointer",
    border: "none",
    textAlign: "left",
    width: "100%"
};

const selectedTileStyle: React.CSSProperties = {
    outline: "3px solid #FFFFFF",
    outlineOffset: -3,
    boxShadow: "0 0 0 2px #242424"
};

const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 10
};

const Tile = (props: { tile: ITile; min: number; max: number; selected: boolean; onSelect: (id: string) => void }): React.ReactElement => {
    const { tile, min, max, selected, onSelect } = props;
    const style: React.CSSProperties = {
        ...tileStyle,
        ...(selected ? selectedTileStyle : {}),
        backgroundColor: heatColour(tile.heat, min, max)
    };
    return (
        <button type="button" style={style} title={tile.id} aria-pressed={selected} onClick={() => onSelect(tile.id)}>
            <Text size={200} weight="semibold" style={{ color: "#FFFFFF" }}>
                {tile.label}
            </Text>
            <Text size={400} style={{ color: "#FFFFFF" }}>
                {tile.heatText === "" ? "no value" : tile.heatText}
            </Text>
        </button>
    );
};

const describePages = (snapshot: IDatasetSnapshot): string => {
    const p = snapshot.paging;
    const total = p.totalResultCount < 0 ? "more than 5,000" : String(p.totalResultCount);
    const size = p.pageSize === null ? "unknown" : String(p.pageSize);
    const range =
        p.firstPageNumber === null || p.lastPageNumber === null
            ? "page numbers not reported"
            : p.firstPageNumber === p.lastPageNumber
              ? `page ${p.firstPageNumber}`
              : `pages ${p.firstPageNumber} to ${p.lastPageNumber}`;
    return `${p.loadedCount} loaded of ${total} rows, page size ${size}, ${range}.`;
};

const describeSort = (snapshot: IDatasetSnapshot): string => {
    if (snapshot.sort === null) {
        return "Sort: not reported by this host.";
    }
    const column = snapshot.columns.find((c) => c.name === snapshot.sort?.name);
    const label = column === undefined ? snapshot.sort.name : column.displayName;
    return `Sort: ${label} ${snapshot.sort.direction}.`;
};

export const Heatmap = (props: IHeatmapProps): React.ReactElement => {
    const s = props.snapshot;
    const width = props.allocatedWidth > 0 ? props.allocatedWidth : undefined;

    // Learn: -1 means no height limit, so the control grows with its rows.
    // A positive height (canvas, or a subgrid with a height set by the maker)
    // is a box to stay inside: the header and buttons keep their place and
    // only the tile area scrolls.
    const boxed = props.allocatedHeight > 0;
    const rootStyle: React.CSSProperties = {
        backgroundColor: "transparent",
        width: "100%",
        maxWidth: width,
        height: boxed ? props.allocatedHeight : undefined,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box"
    };
    const tileAreaStyle: React.CSSProperties = boxed ? { flex: "1 1 auto", minHeight: 0, overflowY: "auto" } : {};

    const renderBody = (): React.ReactElement => {
        if (s.error) {
            return <Text size={200}>The dataset reported an error: {s.errorMessage === "" ? "no message" : s.errorMessage}</Text>;
        }
        if (s.loading && s.tiles.length === 0) {
            return <Text size={200}>Loading rows...</Text>;
        }
        if (s.tiles.length === 0) {
            return <Text size={200}>No rows in this page.</Text>;
        }
        return (
            <div style={gridStyle}>
                {s.tiles.map((tile) => (
                    <Tile
                        key={tile.id}
                        tile={tile}
                        min={s.heatMin}
                        max={s.heatMax}
                        selected={tile.id === props.selectedId}
                        onSelect={props.onSelectTile}
                    />
                ))}
            </div>
        );
    };

    return (
        <FluentProvider theme={props.theme} style={rootStyle}>
            <Label weight="semibold">{s.viewTitle === "" ? "Network heatmap" : s.viewTitle}</Label>
            <div>
                <Text size={200}>
                    Table {s.targetEntity === "" ? "unknown" : s.targetEntity}. {describePages(s)} {describeSort(s)} Theme from{" "}
                    {props.themeSource === "host" ? (props.isDarkTheme ? "host (dark)" : "host (light)") : "control fallback"}.
                    {s.loading ? " Refreshing..." : ""}
                </Text>
            </div>
            <div style={tileAreaStyle}>{renderBody()}</div>
            <div style={rowStyle}>
                <Button size="small" disabled={props.selectedId === null} onClick={props.onOpenSelected}>
                    Open selected record
                </Button>
                <Text size={200}>
                    {props.selectedId === null
                        ? "No tile selected."
                        : `Selected ${props.selectedId}. Host reports ${s.selectedIds.length} selected.`}
                </Text>
            </div>
            <div style={rowStyle}>
                <Button size="small" onClick={() => props.onSortHeat(true)}>
                    Hottest first
                </Button>
                <Button size="small" onClick={() => props.onSortHeat(false)}>
                    Coolest first
                </Button>
                <Button size="small" onClick={props.onSortLabel}>
                    By name
                </Button>
            </div>
            <div style={rowStyle}>
                <Button size="small" disabled={!s.paging.hasPreviousPage} onClick={props.onFirstPage}>
                    First page
                </Button>
                <Button size="small" disabled={!s.paging.hasPreviousPage} onClick={props.onPreviousPage}>
                    Previous page
                </Button>
                <Button size="small" disabled={!s.paging.hasNextPage} onClick={props.onNextPage}>
                    Next page
                </Button>
                <Button size="small" disabled={!s.paging.hasNextPage} onClick={props.onLoadMore}>
                    Load more
                </Button>
                <Button size="small" onClick={props.onReload}>
                    Reload
                </Button>
            </div>
        </FluentProvider>
    );
};
