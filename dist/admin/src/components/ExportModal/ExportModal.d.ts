import React from 'react';
import { dataFormats } from '../../utils/dataFormats';
export interface ExportOptions {
    exportFormat: typeof dataFormats[keyof typeof dataFormats];
    applyFilters: boolean;
    relationsAsId: boolean;
    deepness: number;
    exportPluginsContentTypes: boolean;
    exportAllLocales: boolean;
    exportRelations: boolean;
    deepPopulateRelations: boolean;
    deepPopulateComponentRelations: boolean;
}
export interface ExportModalProps {
    availableExportFormats?: Array<typeof dataFormats[keyof typeof dataFormats]>;
    unavailableOptions?: string[];
    documentIds?: string[] | null;
}
export declare const useExportModal: ({ availableExportFormats, unavailableOptions, documentIds }: ExportModalProps) => {
    options: ExportOptions;
    setOptions: React.Dispatch<React.SetStateAction<ExportOptions>>;
    data: string | Record<string, string> | null;
    setData: React.Dispatch<React.SetStateAction<string | Record<string, string> | null>>;
    fetchingData: boolean;
    setFetchingData: React.Dispatch<React.SetStateAction<boolean>>;
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleSetOption: <K extends keyof ExportOptions>(optionName: K, value: ExportOptions[K]) => void;
    shouldShowOption: (optionName: string) => boolean;
    getData: () => Promise<void>;
    writeDataToFile: () => Promise<void>;
    copyToClipboard: () => void;
    clearData: () => void;
    resetOptions: () => void;
    handleOpenChange: (open: boolean) => void;
    shouldShowDeepnessOption: () => boolean;
    availableExportFormats: string[];
    unavailableOptions: string[];
    slug: string;
    isSlugWholeDb: boolean;
};
export declare const ExportModalContent: React.FC<{
    state: ReturnType<typeof useExportModal>;
}>;
export declare const ExportModalFooter: React.FC<{
    state: ReturnType<typeof useExportModal>;
}>;
