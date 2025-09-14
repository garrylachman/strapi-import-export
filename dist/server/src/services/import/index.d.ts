declare const importService: {
    importData: any;
    importDataV2: any;
    parseInputData: any;
    isImportInProgress: () => boolean;
    setImportInProgress: (status: any) => void;
    setSSEClient: (client: any) => void;
    clearSSEClient: () => void;
    importDataV3: (fileContent: any, options: any, progressOptions: any) => Promise<import("./import-v3").ImportResult>;
};
export default importService;
