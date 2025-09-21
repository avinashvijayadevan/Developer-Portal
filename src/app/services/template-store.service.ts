import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

import {
  BookInstance,
  BookTemplate,
  CatalogInstance,
  CatalogTemplate,
  PageInstance,
  PageTemplate,
  PageTemplateField,
  TemplateState,
} from '../models/templates.model';

const STORAGE_KEY = 'developer-portal-template-state';

function safeParseState(raw: string | null): TemplateState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as TemplateState;
    if (parsed && typeof parsed === 'object') {
      return {
        pageTemplates: parsed.pageTemplates ?? [],
        bookTemplates: parsed.bookTemplates ?? [],
        catalogTemplates: parsed.catalogTemplates ?? [],
        pages: parsed.pages ?? [],
        books: parsed.books ?? [],
        catalogs: parsed.catalogs ?? [],
      };
    }
  } catch (error) {
    console.warn('Unable to read stored template state', error);
  }

  return null;
}

const defaultState: TemplateState = {
  pageTemplates: [],
  bookTemplates: [],
  catalogTemplates: [],
  pages: [],
  books: [],
  catalogs: [],
};

@Injectable({ providedIn: 'root' })
export class TemplateStoreService {
  private readonly stateSubject = new BehaviorSubject<TemplateState>(this.loadState());
  readonly state$ = this.stateSubject.asObservable();

  readonly pageTemplates$ = this.state$.pipe(map((state) => state.pageTemplates));
  readonly bookTemplates$ = this.state$.pipe(map((state) => state.bookTemplates));
  readonly catalogTemplates$ = this.state$.pipe(map((state) => state.catalogTemplates));
  readonly pageInstances$ = this.state$.pipe(map((state) => state.pages));
  readonly bookInstances$ = this.state$.pipe(map((state) => state.books));
  readonly catalogInstances$ = this.state$.pipe(map((state) => state.catalogs));

  createPageTemplate(input: { name: string; description?: string; fields: PageTemplateField[] }): PageTemplate {
    const template: PageTemplate = {
      id: this.createId('pt'),
      ...input,
      fields: input.fields.map((field) => ({ ...field })),
    };

    this.setState({
      ...this.stateSubject.value,
      pageTemplates: [...this.stateSubject.value.pageTemplates, template],
    });

    return template;
  }

  removePageTemplate(templateId: string): void {
    const current = this.stateSubject.value;
    const pagesToRemove = new Set(current.pages.filter((page) => page.templateId === templateId).map((page) => page.id));

    const remainingPages = current.pages.filter((page) => page.templateId !== templateId);

    const updatedBooks = current.books
      .map((book) => ({
        ...book,
        pageInstanceIds: book.pageInstanceIds.filter((id) => !pagesToRemove.has(id)),
      }))
      .filter((book) => book.pageInstanceIds.length > 0);

    const updatedBookTemplates = current.bookTemplates
      .map((bookTemplate) => {
        const filteredPages = bookTemplate.pageTemplateIds.filter((id) => id !== templateId);
        return { ...bookTemplate, pageTemplateIds: filteredPages };
      })
      .filter((template) => template.pageTemplateIds.length > 0);

    const validBookTemplateIds = new Set(updatedBookTemplates.map((template) => template.id));
    const booksAfterTemplateCleanup = updatedBooks.filter((book) => validBookTemplateIds.has(book.templateId));

    const removedBookIds = new Set(
      current.books.map((book) => book.id).filter((id) => !booksAfterTemplateCleanup.some((book) => book.id === id))
    );

    const cleanedCatalogs = current.catalogs
      .map((catalog) => ({
        ...catalog,
        bookInstanceIds: catalog.bookInstanceIds.filter((id) => !removedBookIds.has(id)),
      }))
      .filter((catalog) => catalog.bookInstanceIds.length > 0);

    const cleanedCatalogTemplates = current.catalogTemplates
      .map((catalogTemplate) => ({
        ...catalogTemplate,
        bookTemplateIds: catalogTemplate.bookTemplateIds.filter((id) => validBookTemplateIds.has(id)),
      }))
      .filter((template) => template.bookTemplateIds.length > 0);

    this.setState({
      ...current,
      pageTemplates: current.pageTemplates.filter((template) => template.id !== templateId),
      pages: remainingPages,
      bookTemplates: updatedBookTemplates,
      books: booksAfterTemplateCleanup,
      catalogTemplates: cleanedCatalogTemplates,
      catalogs: cleanedCatalogs,
    });
  }

  createBookTemplate(input: { name: string; description?: string; pageTemplateIds: string[] }): BookTemplate {
    const template: BookTemplate = {
      id: this.createId('bt'),
      ...input,
      pageTemplateIds: [...input.pageTemplateIds],
    };

    this.setState({
      ...this.stateSubject.value,
      bookTemplates: [...this.stateSubject.value.bookTemplates, template],
    });

    return template;
  }

  removeBookTemplate(templateId: string): void {
    const current = this.stateSubject.value;
    const booksToRemove = new Set(current.books.filter((book) => book.templateId === templateId).map((book) => book.id));

    const updatedCatalogs = current.catalogs.filter((catalog) => catalog.bookInstanceIds.every((id) => !booksToRemove.has(id)));

    const updatedCatalogTemplates = current.catalogTemplates
      .map((template) => ({
        ...template,
        bookTemplateIds: template.bookTemplateIds.filter((id) => id !== templateId),
      }))
      .filter((template) => template.bookTemplateIds.length > 0);

    this.setState({
      ...current,
      bookTemplates: current.bookTemplates.filter((template) => template.id !== templateId),
      books: current.books.filter((book) => book.templateId !== templateId),
      catalogs: updatedCatalogs,
      catalogTemplates: updatedCatalogTemplates,
    });
  }

  createCatalogTemplate(input: { name: string; description?: string; bookTemplateIds: string[] }): CatalogTemplate {
    const template: CatalogTemplate = {
      id: this.createId('ct'),
      ...input,
      bookTemplateIds: [...input.bookTemplateIds],
    };

    this.setState({
      ...this.stateSubject.value,
      catalogTemplates: [...this.stateSubject.value.catalogTemplates, template],
    });

    return template;
  }

  removeCatalogTemplate(templateId: string): void {
    const current = this.stateSubject.value;
    this.setState({
      ...current,
      catalogTemplates: current.catalogTemplates.filter((template) => template.id !== templateId),
      catalogs: current.catalogs.filter((catalog) => catalog.templateId !== templateId),
    });
  }

  createPageInstance(input: { templateId: string; title: string; values: Record<string, string> }): PageInstance {
    const instance: PageInstance = {
      id: this.createId('p'),
      ...input,
    };

    this.setState({
      ...this.stateSubject.value,
      pages: [...this.stateSubject.value.pages, instance],
    });

    return instance;
  }

  removePageInstance(pageId: string): void {
    const current = this.stateSubject.value;
    const updatedBooks = current.books
      .map((book) => ({
        ...book,
        pageInstanceIds: book.pageInstanceIds.filter((id) => id !== pageId),
      }))
      .filter((book) => book.pageInstanceIds.length > 0);

    const removedBookIds = new Set(current.books.map((book) => book.id).filter((id) => !updatedBooks.some((book) => book.id === id)));

    const updatedCatalogs = current.catalogs
      .map((catalog) => ({
        ...catalog,
        bookInstanceIds: catalog.bookInstanceIds.filter((id) => !removedBookIds.has(id)),
      }))
      .filter((catalog) => catalog.bookInstanceIds.length > 0);

    this.setState({
      ...current,
      pages: current.pages.filter((page) => page.id !== pageId),
      books: updatedBooks,
      catalogs: updatedCatalogs,
    });
  }

  createBookInstance(input: { templateId: string; title: string; pageInstanceIds: string[] }): BookInstance {
    const instance: BookInstance = {
      id: this.createId('b'),
      ...input,
      pageInstanceIds: [...input.pageInstanceIds],
    };

    this.setState({
      ...this.stateSubject.value,
      books: [...this.stateSubject.value.books, instance],
    });

    return instance;
  }

  removeBookInstance(bookId: string): void {
    const current = this.stateSubject.value;
    this.setState({
      ...current,
      books: current.books.filter((book) => book.id !== bookId),
      catalogs: current.catalogs
        .map((catalog) => ({
          ...catalog,
          bookInstanceIds: catalog.bookInstanceIds.filter((id) => id !== bookId),
        }))
        .filter((catalog) => catalog.bookInstanceIds.length > 0),
    });
  }

  createCatalogInstance(input: { templateId: string; title: string; bookInstanceIds: string[] }): CatalogInstance {
    const instance: CatalogInstance = {
      id: this.createId('c'),
      ...input,
      bookInstanceIds: [...input.bookInstanceIds],
    };

    this.setState({
      ...this.stateSubject.value,
      catalogs: [...this.stateSubject.value.catalogs, instance],
    });

    return instance;
  }

  removeCatalogInstance(catalogId: string): void {
    const current = this.stateSubject.value;
    this.setState({
      ...current,
      catalogs: current.catalogs.filter((catalog) => catalog.id !== catalogId),
    });
  }

  resetAll(): void {
    this.setState({
      pageTemplates: [],
      bookTemplates: [],
      catalogTemplates: [],
      pages: [],
      books: [],
      catalogs: [],
    });
  }

  private createId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 8);
    const timestamp = Date.now().toString(36).slice(-4);
    return `${prefix}-${timestamp}${random}`;
  }

  private setState(state: TemplateState): void {
    this.stateSubject.next(state);
    this.persistState(state);
  }

  private loadState(): TemplateState {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return { ...defaultState };
    }

    const stored = safeParseState(window.localStorage.getItem(STORAGE_KEY));
    return stored ?? { ...defaultState };
  }

  private persistState(state: TemplateState): void {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Unable to persist template state', error);
    }
  }
}
