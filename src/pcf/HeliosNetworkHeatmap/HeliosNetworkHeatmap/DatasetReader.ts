// Turns the platform's dataset object into plain values the picture can draw.
// Nothing in here touches React, and nothing in here calls a method that changes
// the dataset. Reading only. Paging and refresh calls live in index.ts.

type DataSet = ComponentFramework.PropertyTypes.DataSet;
type Column = ComponentFramework.PropertyHelper.DataSetApi.Column;
type EntityRecord = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;

// The property-set names from ControlManifest.Input.xml. The host reports the
// column a maker bound to each property-set with alias set to this name.
export const HEAT_ALIAS = "heatValue";
export const LABEL_ALIAS = "tileLabel";

export interface IColumnSummary {
    name: string;
    alias: string;
    displayName: string;
    dataType: string;
    order: number;
    isPrimary: boolean;
}

export interface ITile {
    id: string;
    label: string;
    heat: number | null;
    heatText: string;
}

export interface IPagingSummary {
    totalResultCount: number;
    pageSize: number | null;
    firstPageNumber: number | null;
    lastPageNumber: number | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    loadedCount: number;
}

// How a property-set was matched to a real column. Logged so each host can be
// compared: Dataverse views, the harness and canvas apps do not all agree.
export type ColumnMatch = "alias" | "name" | "assumed";

export interface IBoundColumn {
    name: string;
    match: ColumnMatch;
}

export interface IDatasetSnapshot {
    loading: boolean;
    error: boolean;
    errorMessage: string;
    targetEntity: string;
    viewTitle: string;
    viewId: string;
    columns: IColumnSummary[];
    heatColumn: IBoundColumn;
    labelColumn: IBoundColumn;
    tiles: ITile[];
    heatMin: number;
    heatMax: number;
    paging: IPagingSummary;
}

// Finds the column a maker bound to a property-set. In model-driven apps the
// column keeps its logical name in "name" and carries the property-set name in
// "alias". In the test harness name and alias are both the property-set name.
// If neither matches, the property-set name itself is used as the column name,
// which is what the canvas tutorial on Learn does.
export function resolveBoundColumn(columns: Column[], alias: string): IBoundColumn {
    const byAlias = columns.find((column) => column.alias === alias);
    if (byAlias !== undefined) {
        return { name: byAlias.name, match: "alias" };
    }
    const byName = columns.find((column) => column.name === alias);
    if (byName !== undefined) {
        return { name: byName.name, match: "name" };
    }
    return { name: alias, match: "assumed" };
}

// Numbers arrive as numbers from Dataverse, but the harness and canvas apps can
// hand back strings, so both are accepted and anything else becomes null.
function asFiniteNumber(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

// Some hosts leave paging fields undefined (the harness does), so each one is
// read defensively instead of trusted.
function readOptionalNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeString(read: () => string): string {
    try {
        const value = read();
        return typeof value === "string" ? value : "";
    } catch {
        return "";
    }
}

function summariseColumn(column: Column): IColumnSummary {
    return {
        name: column.name,
        alias: column.alias,
        displayName: column.displayName,
        dataType: column.dataType,
        order: column.order,
        isPrimary: column.isPrimary === true
    };
}

// Reading a column the host does not know can throw in some hosts, so every
// read is wrapped and a failure becomes "no value" rather than a broken tile.
function readFormatted(record: EntityRecord, columnName: string): string {
    try {
        const value = record.getFormattedValue(columnName);
        return typeof value === "string" ? value : "";
    } catch {
        return "";
    }
}

function readRaw(record: EntityRecord, columnName: string): unknown {
    try {
        return record.getValue(columnName);
    } catch {
        return null;
    }
}

function readTile(
    record: EntityRecord,
    heatColumn: string,
    labelColumn: string,
    primaryColumn: string | null
): ITile {
    const id = record.getRecordId();

    // Label: the bound tileLabel column, else the view's primary column, else
    // the name the host gives the record, else the id.
    let label = readFormatted(record, labelColumn);
    if (label === "" && primaryColumn !== null) {
        label = readFormatted(record, primaryColumn);
    }
    if (label === "") {
        const reference = record.getNamedReference();
        label = typeof reference.name === "string" ? reference.name : "";
    }
    if (label === "") {
        label = id;
    }

    const heat = asFiniteNumber(readRaw(record, heatColumn));
    let heatText = readFormatted(record, heatColumn);
    if (heatText === "" && heat !== null) {
        heatText = String(heat);
    }

    return { id, label, heat, heatText };
}

export function readSnapshot(ds: DataSet): IDatasetSnapshot {
    const columns: Column[] = Array.isArray(ds.columns) ? ds.columns : [];
    const heatColumn = resolveBoundColumn(columns, HEAT_ALIAS);
    const labelColumn = resolveBoundColumn(columns, LABEL_ALIAS);
    const primaryCol = columns.find((column) => column.isPrimary === true && column.alias !== HEAT_ALIAS);
    const primaryColumn = primaryCol === undefined ? null : primaryCol.name;

    // sortedRecordIds is the order the query returned. records is a map keyed by id.
    const ids: string[] = Array.isArray(ds.sortedRecordIds) ? ds.sortedRecordIds : [];
    const tiles: ITile[] = [];
    for (const id of ids) {
        const record: EntityRecord | undefined = ds.records[id];
        if (record !== undefined) {
            tiles.push(readTile(record, heatColumn.name, labelColumn.name, primaryColumn));
        }
    }

    const heats: number[] = [];
    for (const tile of tiles) {
        if (tile.heat !== null) {
            heats.push(tile.heat);
        }
    }
    const heatMin = heats.length === 0 ? 0 : Math.min(...heats);
    const heatMax = heats.length === 0 ? 0 : Math.max(...heats);

    const p: Partial<ComponentFramework.PropertyHelper.DataSetApi.Paging> = ds.paging;
    const paging: IPagingSummary = {
        totalResultCount: readOptionalNumber(p.totalResultCount) ?? -1,
        pageSize: readOptionalNumber(p.pageSize),
        firstPageNumber: readOptionalNumber(p.firstPageNumber),
        lastPageNumber: readOptionalNumber(p.lastPageNumber),
        hasNextPage: p.hasNextPage === true,
        hasPreviousPage: p.hasPreviousPage === true,
        loadedCount: tiles.length
    };

    return {
        loading: ds.loading === true,
        error: ds.error === true,
        errorMessage: typeof ds.errorMessage === "string" ? ds.errorMessage : "",
        targetEntity: safeString(() => ds.getTargetEntityType()),
        viewTitle: safeString(() => ds.getTitle()),
        viewId: safeString(() => ds.getViewId()),
        columns: columns.map(summariseColumn),
        heatColumn,
        labelColumn,
        tiles,
        heatMin,
        heatMax,
        paging
    };
}
