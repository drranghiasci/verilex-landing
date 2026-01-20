/**
 * Schema Types
 */
export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'multiselect' | 'structured' | 'list';

export type FieldDef = {
  key: string;
  type: FieldType;
  required: boolean;
  isSystem?: boolean;
  notes?: string;
  enumValues?: string[];
};

export type SectionDef = {
  id: string;
  title: string;
  fields: FieldDef[];
};

export type SchemaDef = {
  version: string;
  sections: SectionDef[];
};

export type AiFlagDef = {
  key: string;
  trigger: string;
};

