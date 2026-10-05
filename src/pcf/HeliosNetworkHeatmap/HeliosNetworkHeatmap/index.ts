import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { Heatmap, IHeatmapProps } from "./Heatmap";
import { readSnapshot } from "./DatasetReader";
import * as React from "react";
import { webLightTheme } from "@fluentui/react-components";

type DataSet = ComponentFramework.PropertyTypes.DataSet;

const LOG = "[HeliosNetworkHeatmap]";
const DEFAULT_PAGE_SIZE = 12;

export class HeliosNetworkHeatmap implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;
    private dataset: DataSet;
    private appliedPageSize: number | null = null;
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

        // Learn says dataset values are not initialised in init, so the record
        // count is read defensively here and only ever logged, never used.
        const recordsAtInit: unknown = context.parameters.substations.records;
        console.log(`${LOG} init`, {
            formFactor: context.client.getFormFactor(),
            allocatedWidth: context.mode.allocatedWidth,
            allocatedHeight: context.mode.allocatedHeight,
            pageSizeInput: context.parameters.pageSize.raw,
            datasetRecordsAtInit: typeof recordsAtInit === "object" && recordsAtInit !== null ? Object.keys(recordsAtInit).length : -1,
            restoredState: state
        });
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        this.updateCount += 1;
        const ds = context.parameters.substations;
        this.dataset = ds;

        this.applyPageSize(context);

        const snapshot = readSnapshot(ds);
        console.log(`${LOG} updateView #${this.updateCount}`, {
            updatedProperties: context.updatedProperties,
            loading: snapshot.loading,
            error: snapshot.error,
            errorMessage: snapshot.errorMessage,
            targetEntity: snapshot.targetEntity,
            viewTitle: snapshot.viewTitle,
            viewId: snapshot.viewId,
            columns: snapshot.columns,
            heatColumn: snapshot.heatColumn,
            labelColumn: snapshot.labelColumn,
            recordCount: snapshot.tiles.length,
            firstThreeTiles: snapshot.tiles.slice(0, 3),
            heatRange: { min: snapshot.heatMin, max: snapshot.heatMax },
            paging: snapshot.paging,
            allocatedWidth: context.mode.allocatedWidth,
            allocatedHeight: context.mode.allocatedHeight
        });

        const props: IHeatmapProps = {
            snapshot: snapshot,
            theme: webLightTheme,
            allocatedWidth: Number(context.mode.allocatedWidth),
            onFirstPage: this.onFirstPage,
            onPreviousPage: this.onPreviousPage,
            onNextPage: this.onNextPage,
            onLoadMore: this.onLoadMore,
            onReload: this.onReload
        };
        return React.createElement(Heatmap, props);
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        console.log(`${LOG} destroy`);
    }

    // setPageSize only takes effect on the next fetch, so it is followed by a
    // refresh. The guard stops it running on every updateView, which would
    // otherwise refresh forever, and it waits until the host is not mid-load.
    private applyPageSize(context: ComponentFramework.Context<IInputs>): void {
        const ds = context.parameters.substations;
        const requested = context.parameters.pageSize.raw ?? DEFAULT_PAGE_SIZE;
        if (requested <= 0 || requested === this.appliedPageSize || ds.loading) {
            return;
        }
        this.appliedPageSize = requested;
        console.log(`${LOG} applying page size`, { requested, pageSizeBefore: ds.paging.pageSize });
        this.callDataset("paging.setPageSize", () => ds.paging.setPageSize(requested));
        this.callDataset("refresh", () => ds.refresh());
    }

    private currentFirstPage(): number {
        const first = this.dataset.paging.firstPageNumber;
        return typeof first === "number" && first > 0 ? first : 1;
    }

    private currentLastPage(): number {
        const last = this.dataset.paging.lastPageNumber;
        return typeof last === "number" && last > 0 ? last : 1;
    }

    private onFirstPage = (): void => {
        this.callDataset("paging.loadExactPage(1)", () => this.dataset.paging.loadExactPage(1));
    };

    private onPreviousPage = (): void => {
        const target = Math.max(1, this.currentFirstPage() - 1);
        this.callDataset(`paging.loadExactPage(${target})`, () => this.dataset.paging.loadExactPage(target));
    };

    private onNextPage = (): void => {
        const target = this.currentLastPage() + 1;
        this.callDataset(`paging.loadExactPage(${target})`, () => this.dataset.paging.loadExactPage(target));
    };

    // loadNextPage with no argument keeps the pages already loaded and adds the
    // next one, so the loaded range grows instead of moving.
    private onLoadMore = (): void => {
        this.callDataset("paging.loadNextPage()", () => this.dataset.paging.loadNextPage());
    };

    private onReload = (): void => {
        this.callDataset("paging.reset()", () => this.dataset.paging.reset());
    };

    // Every call that asks the host for data goes through here so the console
    // shows what was asked for and what the paging state was at that moment.
    // The host answers later with another updateView.
    private callDataset(label: string, action: () => void): void {
        const p = this.dataset.paging;
        console.log(`${LOG} dataset call`, {
            label,
            firstPageNumber: p.firstPageNumber,
            lastPageNumber: p.lastPageNumber,
            hasNextPage: p.hasNextPage,
            hasPreviousPage: p.hasPreviousPage,
            loading: this.dataset.loading
        });
        try {
            action();
        } catch (error: unknown) {
            console.warn(`${LOG} dataset call failed`, { label, error: error instanceof Error ? error.message : String(error) });
        }
    }
}
