import { ImportContext } from './import-context';
import { ImportResult } from '../import-v3';
export declare class ImportProcessor {
    private context;
    private onProgress?;
    private services;
    private totalEntries;
    private processedEntries;
    constructor(context: ImportContext, services: {
        documents: typeof strapi.documents;
    }, onProgress?: (progress: number, message: string) => void);
    process(): Promise<ImportResult>;
    private reportProgress;
    private processEntry;
    private importVersionData;
    private processEntryData;
    private processRelation;
    private findInDatabase;
    private processComponent;
    private processComponentItem;
    private processDynamicZone;
    private processMedia;
    private findEntryInImportData;
    private sanitizeData;
}
