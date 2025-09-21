export type FieldType = 'short-text' | 'long-text' | 'number' | 'date';

export interface PageTemplateField {
  id: string;
  name: string;
  type: FieldType;
  description?: string;
}

export interface PageTemplate {
  id: string;
  name: string;
  description?: string;
  fields: PageTemplateField[];
}

export interface BookTemplate {
  id: string;
  name: string;
  description?: string;
  pageTemplateIds: string[];
}

export interface CatalogTemplate {
  id: string;
  name: string;
  description?: string;
  bookTemplateIds: string[];
}

export interface PageInstance {
  id: string;
  templateId: string;
  title: string;
  values: Record<string, string>;
}

export interface BookInstance {
  id: string;
  templateId: string;
  title: string;
  pageInstanceIds: string[];
}

export interface CatalogInstance {
  id: string;
  templateId: string;
  title: string;
  bookInstanceIds: string[];
}

export interface TemplateState {
  pageTemplates: PageTemplate[];
  bookTemplates: BookTemplate[];
  catalogTemplates: CatalogTemplate[];
  pages: PageInstance[];
  books: BookInstance[];
  catalogs: CatalogInstance[];
}
