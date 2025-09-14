interface Preferences {
    applyFilters: boolean;
    deepness: number;
}
export declare const useLocalStorage: () => {
    getPreferences: () => Preferences;
    updatePreferences: (partialPreferences: Partial<Preferences>) => void;
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
};
export {};
