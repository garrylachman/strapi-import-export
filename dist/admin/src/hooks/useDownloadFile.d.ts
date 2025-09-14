export declare const useDownloadFile: () => {
    downloadFile: (content: string, filename: string, contentType: string) => void;
    withTimestamp: (fileName: string) => string;
};
