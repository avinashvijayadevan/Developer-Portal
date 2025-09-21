import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import {
  BookTemplate,
  CatalogTemplate,
  FieldType,
  PageTemplate,
  PageTemplateField,
} from '../../models/templates.model';
import { TemplateStoreService } from '../../services/template-store.service';

interface PageTemplateFormValue {
  name: string;
  description?: string;
  fields: PageTemplateFieldDraft[];
}

interface PageTemplateFieldDraft {
  name: string;
  type: FieldType;
  description?: string;
}

@Component({
  selector: 'app-template-manager',
  templateUrl: './template-manager.component.html',
  styleUrls: ['./template-manager.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateManagerComponent {
  readonly pageTemplates$: Observable<PageTemplate[]> = this.store.pageTemplates$;
  readonly bookTemplates$: Observable<BookTemplate[]> = this.store.bookTemplates$;
  readonly catalogTemplates$: Observable<CatalogTemplate[]> = this.store.catalogTemplates$;

  readonly fieldTypes: { value: FieldType; label: string }[] = [
    { value: 'short-text', label: 'Short text' },
    { value: 'long-text', label: 'Long text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
  ];

  readonly pageTemplateForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    fields: this.fb.array<FormGroup>([], Validators.required),
  });

  readonly fieldDraftForm = this.fb.group({
    name: ['', Validators.required],
    type: ['short-text' as FieldType, Validators.required],
    description: [''],
  });

  readonly bookTemplateForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    pageTemplateIds: new FormControl<string[]>([], { nonNullable: true, validators: [Validators.required] }),
  });

  readonly catalogTemplateForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    bookTemplateIds: new FormControl<string[]>([], { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(private readonly fb: FormBuilder, private readonly store: TemplateStoreService) {}

  get fields(): FormArray<FormGroup> {
    return this.pageTemplateForm.get('fields') as FormArray<FormGroup>;
  }

  addField(): void {
    if (this.fieldDraftForm.invalid) {
      this.fieldDraftForm.markAllAsTouched();
      return;
    }

    const value = this.fieldDraftForm.getRawValue();
    this.fields.push(
      this.fb.group({
        name: [value.name.trim(), Validators.required],
        type: [value.type, Validators.required],
        description: [value.description?.trim() ?? ''],
      })
    );

    this.pageTemplateForm.updateValueAndValidity();
    this.fieldDraftForm.reset({ name: '', type: 'short-text', description: '' });
  }

  removeField(index: number): void {
    this.fields.removeAt(index);
    this.pageTemplateForm.updateValueAndValidity();
  }

  submitPageTemplate(): void {
    if (this.pageTemplateForm.invalid || this.fields.length === 0) {
      this.pageTemplateForm.markAllAsTouched();
      return;
    }

    const formValue: PageTemplateFormValue = {
      ...this.pageTemplateForm.getRawValue(),
      fields: this.fields.controls.map((control) => ({
        name: (control.value as PageTemplateFieldDraft).name.trim(),
        type: (control.value as PageTemplateFieldDraft).type,
        description: (control.value as PageTemplateFieldDraft).description?.trim(),
      })),
    };

    const fields: PageTemplateField[] = formValue.fields.map((field) => ({
      id: this.createId('field'),
      name: field.name,
      type: field.type,
      description: field.description,
    }));

    this.store.createPageTemplate({
      name: formValue.name.trim(),
      description: formValue.description?.trim(),
      fields,
    });

    this.resetPageTemplateForm();
  }

  submitBookTemplate(): void {
    if (this.bookTemplateForm.invalid) {
      this.bookTemplateForm.markAllAsTouched();
      return;
    }

    const value = this.bookTemplateForm.getRawValue();
    this.store.createBookTemplate({
      name: value.name.trim(),
      description: value.description?.trim(),
      pageTemplateIds: [...value.pageTemplateIds],
    });

    this.bookTemplateForm.reset({ name: '', description: '', pageTemplateIds: [] });
  }

  submitCatalogTemplate(): void {
    if (this.catalogTemplateForm.invalid) {
      this.catalogTemplateForm.markAllAsTouched();
      return;
    }

    const value = this.catalogTemplateForm.getRawValue();
    this.store.createCatalogTemplate({
      name: value.name.trim(),
      description: value.description?.trim(),
      bookTemplateIds: [...value.bookTemplateIds],
    });

    this.catalogTemplateForm.reset({ name: '', description: '', bookTemplateIds: [] });
  }

  deletePageTemplate(id: string): void {
    this.store.removePageTemplate(id);
  }

  deleteBookTemplate(id: string): void {
    this.store.removeBookTemplate(id);
  }

  deleteCatalogTemplate(id: string): void {
    this.store.removeCatalogTemplate(id);
  }

  resetPageTemplateForm(): void {
    this.pageTemplateForm.reset({ name: '', description: '', fields: [] });
    this.fields.clear();
    this.fieldDraftForm.reset({ name: '', type: 'short-text', description: '' });
  }

  getFieldLabel(type: FieldType): string {
    const match = this.fieldTypes.find((item) => item.value === type);
    return match?.label ?? type;
  }

  trackById<T extends { id: string }>(index: number, item: T): string {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  resetAllData(): void {
    this.store.resetAll();
    this.resetPageTemplateForm();
    this.bookTemplateForm.reset({ name: '', description: '', pageTemplateIds: [] });
    this.catalogTemplateForm.reset({ name: '', description: '', bookTemplateIds: [] });
  }

  private createId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 8);
    const timestamp = Date.now().toString(36).slice(-4);
    return `${prefix}-${timestamp}${random}`;
  }
}
