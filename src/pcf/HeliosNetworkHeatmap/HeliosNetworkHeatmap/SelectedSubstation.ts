// The shape of the SelectedSubstation output property, and the JSON schema the
// platform asks for through getOutputSchema so a canvas app can read it as a
// typed record (HeliosNetworkHeatmap1.SelectedSubstation.name and so on).

export interface ISelectedSubstation {
    id: string;
    name: string;
    heat: number;
    hasHeat: boolean;
    heatText: string;
    entityType: string;
}

// Learn: the schema is a subset of JSON schema draft-04. Only string, integer,
// number, boolean, object with properties, and array with items are honoured.
// Anything the control outputs that is not listed here is invisible to canvas.
export const SELECTED_SUBSTATION_SCHEMA = {
    $schema: "http://json-schema.org/draft-04/schema#",
    type: "object",
    properties: {
        id: { type: "string" },
        name: { type: "string" },
        heat: { type: "number" },
        hasHeat: { type: "boolean" },
        heatText: { type: "string" },
        entityType: { type: "string" }
    }
};
