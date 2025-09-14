export interface ExportV3Options {
    slug: string;
    search: string;
    applySearch: boolean;
    exportPluginsContentTypes: boolean;
    documentIds?: string[];
    maxDepth?: number;
    exportAllLocales?: boolean;
    exportRelations?: boolean;
    deepPopulateRelations?: boolean;
    deepPopulateComponentRelations?: boolean;
}
export declare function exportDataV3({ slug, search, applySearch, exportPluginsContentTypes, documentIds, maxDepth, exportAllLocales, exportRelations, deepPopulateRelations, deepPopulateComponentRelations }: ExportV3Options): Promise<string>;
