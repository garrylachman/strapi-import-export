export declare const useForm: <T extends Record<string, any>>(attributes: T) => {
    options: T;
    getOption: (key: keyof T) => T[keyof T];
    setOption: (key: keyof T, value: T[keyof T]) => void;
};
