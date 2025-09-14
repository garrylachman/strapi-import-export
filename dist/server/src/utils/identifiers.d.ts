import { Schema } from '@strapi/types';
export declare function attributeIsUnique(attribute: Schema.Attribute.AnyAttribute): attribute is Schema.Attribute.OfType<'string' | 'text' | 'email' | 'integer' | 'biginteger' | 'float' | 'decimal'>;
export declare function getIdentifierField(model: Schema.Schema): string;
