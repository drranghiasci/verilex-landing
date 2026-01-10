export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'multiselect'
  | 'structured'
  | 'list'
  | 'array';

export type FieldDef = {
  key: string;
  type: FieldType;
  required: boolean;
  notes?: string;
  enumValues?: string[];
  isSystem?: boolean;
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
