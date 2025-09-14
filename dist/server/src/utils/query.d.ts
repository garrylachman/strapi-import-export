import qs from 'qs';
export declare function buildFilterQuery(search?: string): {
    filters: string | qs.ParsedQs | (string | qs.ParsedQs)[];
    sort: {};
};
