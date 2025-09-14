import { ExportContext } from './export-context';
export declare class ExportProcessor {
    private context;
    private services;
    constructor(context: ExportContext, services: {
        documents: typeof strapi.documents;
    });
    processSchema(currentSlug: string): Promise<void>;
    private processEntry;
    private groupByLocale;
    private processDataWithSchema;
    private processRelation;
    private processComponent;
    private processDynamicZone;
    private processMedia;
    private computeUrl;
    private areVersionsEqual;
    getExportData(): string;
}
