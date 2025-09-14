import { FileContent } from './validation';
export declare enum ExistingAction {
    Warn = "warn",
    Update = "update",
    Skip = "skip"
}
interface ImportOptions {
    slug: string;
    user: any;
    allowDraftOnPublished?: boolean;
    existingAction?: ExistingAction;
    ignoreMissingRelations?: boolean;
    allowLocaleUpdates?: boolean;
    disallowNewRelations?: boolean;
}
export interface ImportFailure {
    error: string;
    data: any;
    details?: any;
}
export interface ImportError {
    error: string;
    data: {
        entry: any;
        path: string;
    };
}
export interface ImportResult {
    failures?: ImportFailure[];
    errors?: ImportError[];
    backgroundProcessing?: boolean;
}
export interface LocaleVersions {
    [locale: string]: Record<string, any>;
}
export interface EntryVersion {
    draft?: LocaleVersions;
    published?: LocaleVersions;
}
interface ImportProgressOptions {
    useSSE?: boolean;
    onProgress?: (progress: number, message: string) => void;
}
declare function importDataV3(fileContent: FileContent, { slug, user, allowDraftOnPublished, existingAction, ignoreMissingRelations, allowLocaleUpdates, disallowNewRelations }: ImportOptions, progressOptions?: ImportProgressOptions): Promise<ImportResult>;
export { importDataV3 };
