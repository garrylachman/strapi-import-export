import { UID } from '@strapi/types';
import { EntryVersion, ExistingAction, ImportFailure } from '../import-v3';
interface ProcessedRecordInfo {
    contentType: string;
    idValue: string;
}
export declare class ImportContext {
    readonly options: {
        existingAction: ExistingAction;
        allowDraftOnPublished: boolean;
        ignoreMissingRelations: boolean;
        allowLocaleUpdates: boolean;
        disallowNewRelations: boolean;
    };
    readonly importData: Record<UID.ContentType, EntryVersion[]>;
    readonly user: any;
    readonly failures: ImportFailure[];
    private createdDocumentIds;
    private updatedDocumentIds;
    private processedRecords;
    private processedRecordsByDocumentId;
    constructor(options: {
        existingAction: ExistingAction;
        allowDraftOnPublished: boolean;
        ignoreMissingRelations: boolean;
        allowLocaleUpdates: boolean;
        disallowNewRelations: boolean;
    }, importData: Record<UID.ContentType, EntryVersion[]>, user: any, failures?: ImportFailure[]);
    recordCreated(contentType: string, idValue: string | undefined, documentId: string): void;
    recordUpdated(contentType: string, idValue: string | undefined, documentId: string): void;
    wasDocumentCreatedInThisImport(documentId: string): boolean;
    wasUpdatedInThisImport(contentType: string, idValue: string | undefined): boolean;
    findProcessedRecord(contentType: string, idValue: any): string | undefined;
    findProcessedRecordByDocumentId(documentId: string): ProcessedRecordInfo | undefined;
    addFailure(error: string, data: any, details?: any): void;
    getFailures(): ImportFailure[];
}
export {};
