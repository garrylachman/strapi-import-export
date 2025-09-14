import { UID } from '@strapi/types';
export interface ExportOptions {
    documentIds?: string[];
    applySearch: boolean;
    search: any;
    exportAllLocales: boolean;
    exportRelations: boolean;
    skipRelations: boolean;
    skipComponentRelations: boolean;
}
export declare class ExportContext {
    readonly options: ExportOptions;
    readonly exportedData: Record<string, any>;
    readonly processedRelations: Record<number, Record<string, string[]>>;
    private processedDocumentIds;
    private relations;
    constructor(options: ExportOptions, exportedData?: Record<string, any>, processedRelations?: Record<number, Record<string, string[]>>);
    recordProcessed(documentId: string): void;
    wasProcessed(documentId: string): boolean;
    addRelation(contentType: UID.ContentType, documentId: string): void;
    getRelations(): Record<string, string[]>;
    clearRelations(): void;
    setSkipRelations(skip: boolean): void;
    setSkipComponentRelations(skip: boolean): void;
    setDocumentIds(documentIds: string[]): void;
}
