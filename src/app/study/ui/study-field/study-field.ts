import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

@Component({
  selector: 'app-study-field',
  imports: [FormField],
  host: { class: 'study-field' },
  template: `
    <label [for]="controlId()"
      >{{ label() }}
      @if (required()) {
        <span class="required-mark" aria-hidden="true">*</span>
      }
    </label>
    @if (kind() === 'textarea') {
      <textarea
        [id]="controlId()"
        [formField]="field()"
        [placeholder]="placeholder()"
        rows="4"
        [attr.aria-required]="required()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="descriptionIds()"
      ></textarea>
    } @else if (kind() === 'select') {
      <select
        [id]="controlId()"
        [formField]="field()"
        [attr.aria-required]="required()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="descriptionIds()"
      >
        <option value="">اختر من القائمة</option>
        @for (option of options(); track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
    } @else {
      <div class="input-wrap" [class.with-suffix]="suffix()">
        <input
          [id]="controlId()"
          [formField]="field()"
          type="text"
          [attr.inputmode]="kind() === 'number' ? 'decimal' : 'text'"
          [attr.dir]="kind() === 'number' ? 'ltr' : 'auto'"
          [placeholder]="placeholder()"
          [attr.aria-required]="required()"
          [attr.aria-invalid]="invalid()"
          [attr.aria-describedby]="descriptionIds()"
        />
        @if (suffix()) {
          <span class="input-suffix" [id]="id() + '-unit'">{{ suffix() }}</span>
        }
      </div>
    }
    @if (hint()) {
      <small [id]="id() + '-hint'">{{ hint() }}</small>
    }
    @if (invalid()) {
      <span class="field-error" [id]="id() + '-error'">{{ field()().errors()[0]?.message }}</span>
    }
  `,
})
export class StudyField {
  readonly field = input.required<FieldTree<string>>();
  readonly label = input.required<string>();
  readonly id = input.required<string>();
  readonly controlId = computed(() => this.id() + '-input');
  readonly kind = input<'text' | 'textarea' | 'select' | 'number'>('text');
  readonly required = input(true);
  readonly placeholder = input('');
  readonly suffix = input('');
  readonly hint = input('');
  readonly options = input<readonly { value: string; label: string }[]>([]);
  readonly invalid = computed(() => this.field()().touched() && this.field()().invalid());
  readonly descriptionIds = computed(
    () =>
      [
        this.suffix() ? this.id() + '-unit' : '',
        this.hint() ? this.id() + '-hint' : '',
        this.invalid() ? this.id() + '-error' : '',
      ]
        .filter(Boolean)
        .join(' ') || null,
  );
}
