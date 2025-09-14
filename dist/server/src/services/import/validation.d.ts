import { UID } from '@strapi/types';
import { EntryVersion, ExistingAction } from './import-v3';
interface ValidationError {
    message: string;
    path?: string[];
    entry?: any;
}
interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
interface FileContent {
    version: number;
    data: Record<UID.ContentType, EntryVersion[]>;
}
declare function validateFileContent(fileContent: FileContent, options?: {
    existingAction?: ExistingAction;
    ignoreMissingRelations?: boolean;
}): Promise<ValidationResult>;
export { validateFileContent, type ValidationResult, type ValidationError, type FileContent };
