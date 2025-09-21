import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  BookInstance,
  BookTemplate,
  CatalogInstance,
  CatalogTemplate,
  PageInstance,
  PageTemplate,
} from '../../models/templates.model';
import { TemplateStoreService } from '../../services/template-store.service';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss'],
})
export class ViewerComponent implements OnInit, OnDestroy {
  pageTemplates: PageTemplate[] = [];
  bookTemplates: BookTemplate[] = [];
  catalogTemplates: CatalogTemplate[] = [];

  pageInstances: PageInstance[] = [];
  bookInstances: BookInstance[] = [];
  catalogInstances: CatalogInstance[] = [];

  readonly pageInstanceForm = this.fb.group({
    templateId: ['', Validators.required],
    title: ['', Validators.required],
    values: this.fb.group({}),
  });

  readonly bookInstanceForm = this.fb.group({
    templateId: ['', Validators.required],
    title: ['', Validators.required],
    pageSelections: this.fb.array<FormControl<string | null>>([], Validators.required),
  });

  readonly catalogInstanceForm = this.fb.group({
    templateId: ['', Validators.required],
    title: ['', Validators.required],
    bookSelections: this.fb.array<FormControl<string | null>>([], Validators.required),
  });

  private readonly subscriptions = new Subscription();

  constructor(private readonly fb: FormBuilder, private readonly store: TemplateStoreService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.store.pageTemplates$.subscribe((templates) => {
        this.pageTemplates = templates;
        this.syncPageTemplateSelection();
      })
    );

    this.subscriptions.add(
      this.store.bookTemplates$.subscribe((templates) => {
        this.bookTemplates = templates;
        this.syncBookTemplateSelection();
      })
    );

    this.subscriptions.add(
      this.store.catalogTemplates$.subscribe((templates) => {
        this.catalogTemplates = templates;
        this.syncCatalogTemplateSelection();
      })
    );

    this.subscriptions.add(
      this.store.pageInstances$.subscribe((instances) => {
        this.pageInstances = instances;
        this.validateBookSelections();
      })
    );

    this.subscriptions.add(
      this.store.bookInstances$.subscribe((instances) => {
        this.bookInstances = instances;
        this.validateCatalogSelections();
      })
    );

    this.subscriptions.add(
      this.store.catalogInstances$.subscribe((instances) => {
        this.catalogInstances = instances;
      })
    );

    this.subscriptions.add(
      this.pageInstanceForm
        .get('templateId')!
        .valueChanges.subscribe((templateId) => this.configurePageFields(templateId as string | null))
    );

    this.subscriptions.add(
      this.bookInstanceForm
        .get('templateId')!
        .valueChanges.subscribe((templateId) => this.configureBookSelections(templateId as string | null))
    );

    this.subscriptions.add(
      this.catalogInstanceForm
        .get('templateId')!
        .valueChanges.subscribe((templateId) => this.configureCatalogSelections(templateId as string | null))
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get pageValueGroup(): FormGroup {
    return this.pageInstanceForm.get('values') as FormGroup;
  }

  get bookPageSelections(): FormArray<FormControl<string | null>> {
    return this.bookInstanceForm.get('pageSelections') as FormArray<FormControl<string | null>>;
  }

  get catalogBookSelections(): FormArray<FormControl<string | null>> {
    return this.catalogInstanceForm.get('bookSelections') as FormArray<FormControl<string | null>>;
  }

  submitPageInstance(): void {
    if (this.pageInstanceForm.invalid) {
      this.pageInstanceForm.markAllAsTouched();
      return;
    }

    const { templateId, title } = this.pageInstanceForm.getRawValue();
    const template = this.pageTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const values = this.pageValueGroup.getRawValue() as Record<string, string>;

    this.store.createPageInstance({
      templateId: template.id,
      title: title.trim(),
      values,
    });

    this.pageInstanceForm.reset({ templateId: template.id, title: '', values: {} });
    this.configurePageFields(template.id);
  }

  submitBookInstance(): void {
    if (this.bookInstanceForm.invalid || this.bookPageSelections.length === 0) {
      this.bookInstanceForm.markAllAsTouched();
      return;
    }

    const { templateId, title } = this.bookInstanceForm.getRawValue();
    const template = this.bookTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const selectedPages = this.bookPageSelections.controls.map((control) => control.value).filter((value): value is string => !!value);
    if (selectedPages.length !== template.pageTemplateIds.length) {
      this.bookPageSelections.markAllAsTouched();
      return;
    }

    this.store.createBookInstance({
      templateId: template.id,
      title: title.trim(),
      pageInstanceIds: selectedPages,
    });

    this.bookInstanceForm.reset({ templateId: template.id, title: '', pageSelections: [] });
    this.configureBookSelections(template.id);
  }

  submitCatalogInstance(): void {
    if (this.catalogInstanceForm.invalid || this.catalogBookSelections.length === 0) {
      this.catalogInstanceForm.markAllAsTouched();
      return;
    }

    const { templateId, title } = this.catalogInstanceForm.getRawValue();
    const template = this.catalogTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const selectedBooks = this.catalogBookSelections.controls
      .map((control) => control.value)
      .filter((value): value is string => !!value);

    if (selectedBooks.length !== template.bookTemplateIds.length) {
      this.catalogBookSelections.markAllAsTouched();
      return;
    }

    this.store.createCatalogInstance({
      templateId: template.id,
      title: title.trim(),
      bookInstanceIds: selectedBooks,
    });

    this.catalogInstanceForm.reset({ templateId: template.id, title: '', bookSelections: [] });
    this.configureCatalogSelections(template.id);
  }

  deletePageInstance(id: string): void {
    this.store.removePageInstance(id);
  }

  deleteBookInstance(id: string): void {
    this.store.removeBookInstance(id);
  }

  deleteCatalogInstance(id: string): void {
    this.store.removeCatalogInstance(id);
  }

  pageTemplateFields(templateId: string): PageTemplate | undefined {
    return this.pageTemplates.find((template) => template.id === templateId);
  }

  pagesForTemplate(templateId: string): PageInstance[] {
    return this.pageInstances.filter((page) => page.templateId === templateId);
  }

  booksForTemplate(templateId: string): BookInstance[] {
    return this.bookInstances.filter((book) => book.templateId === templateId);
  }

  trackById<T extends { id: string }>(index: number, item: T): string {
    return item.id;
  }

  pageTemplateName(templateId: string): string {
    return this.pageTemplates.find((template) => template.id === templateId)?.name ?? 'Untitled page';
  }

  bookTemplateName(templateId: string): string {
    return this.bookTemplates.find((template) => template.id === templateId)?.name ?? 'Untitled book';
  }

  private configurePageFields(templateId: string | null): void {
    const group = this.pageValueGroup;
    Object.keys(group.controls).forEach((controlName) => group.removeControl(controlName));

    const template = templateId ? this.pageTemplates.find((item) => item.id === templateId) : undefined;
    if (!template) {
      return;
    }

    template.fields.forEach((field) => {
      group.addControl(field.id, this.fb.control('', Validators.required));
    });
  }

  private configureBookSelections(templateId: string | null): void {
    const array = this.bookPageSelections;
    array.clear();

    const template = templateId ? this.bookTemplates.find((item) => item.id === templateId) : undefined;
    if (!template) {
      return;
    }

    template.pageTemplateIds.forEach(() => {
      array.push(new FormControl<string | null>(null, Validators.required));
    });
  }

  private configureCatalogSelections(templateId: string | null): void {
    const array = this.catalogBookSelections;
    array.clear();

    const template = templateId ? this.catalogTemplates.find((item) => item.id === templateId) : undefined;
    if (!template) {
      return;
    }

    template.bookTemplateIds.forEach(() => {
      array.push(new FormControl<string | null>(null, Validators.required));
    });
  }

  private syncPageTemplateSelection(): void {
    const selectedId = this.pageInstanceForm.get('templateId')!.value as string | null;
    if (selectedId && !this.pageTemplates.some((template) => template.id === selectedId)) {
      this.pageInstanceForm.reset({ templateId: '', title: '', values: {} });
      return;
    }

    if (selectedId) {
      this.configurePageFields(selectedId);
    }
  }

  private syncBookTemplateSelection(): void {
    const selectedId = this.bookInstanceForm.get('templateId')!.value as string | null;
    if (selectedId && !this.bookTemplates.some((template) => template.id === selectedId)) {
      this.bookInstanceForm.reset({ templateId: '', title: '', pageSelections: [] });
      this.bookPageSelections.clear();
      return;
    }

    if (selectedId) {
      this.configureBookSelections(selectedId);
    }
  }

  private syncCatalogTemplateSelection(): void {
    const selectedId = this.catalogInstanceForm.get('templateId')!.value as string | null;
    if (selectedId && !this.catalogTemplates.some((template) => template.id === selectedId)) {
      this.catalogInstanceForm.reset({ templateId: '', title: '', bookSelections: [] });
      this.catalogBookSelections.clear();
      return;
    }

    if (selectedId) {
      this.configureCatalogSelections(selectedId);
    }
  }

  private validateBookSelections(): void {
    const templateId = this.bookInstanceForm.get('templateId')!.value as string | null;
    if (!templateId) {
      return;
    }

    const template = this.bookTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const validPageIds = new Set(this.pageInstances.filter((page) => template.pageTemplateIds.includes(page.templateId)).map((page) => page.id));
    this.bookPageSelections.controls.forEach((control, index) => {
      if (control.value && !validPageIds.has(control.value)) {
        control.setValue(null);
      }
      if (!control.validator) {
        control.addValidators(Validators.required);
      }
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  private validateCatalogSelections(): void {
    const templateId = this.catalogInstanceForm.get('templateId')!.value as string | null;
    if (!templateId) {
      return;
    }

    const template = this.catalogTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const validBookIds = new Set(this.bookInstances.filter((book) => template.bookTemplateIds.includes(book.templateId)).map((book) => book.id));
    this.catalogBookSelections.controls.forEach((control) => {
      if (control.value && !validBookIds.has(control.value)) {
        control.setValue(null);
      }
      if (!control.validator) {
        control.addValidators(Validators.required);
      }
      control.updateValueAndValidity({ emitEvent: false });
    });
  }
}
