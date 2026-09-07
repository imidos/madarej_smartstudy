import { Component, input, output } from '@angular/core';
@Component({
  selector: 'app-row-card',
  template: `<section class="row-card">
    <header>
      <h3>{{ title() }}</h3>
      <button
        type="button"
        class="icon-button danger"
        (click)="requestRemove($event)"
        [attr.aria-label]="'حذف ' + title()"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          aria-hidden="true"
        >
          <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
        </svg>
      </button>
    </header>
    <ng-content />
  </section>`,
})
export class RowCard {
  readonly title = input.required<string>();
  readonly remove = output<void>();
  requestRemove(event: Event): void {
    const button = event.currentTarget as HTMLButtonElement;
    this.remove.emit();
    requestAnimationFrame(() => {
      if (!button.isConnected) document.querySelector<HTMLButtonElement>('.add-button')?.focus();
    });
  }
}
export function confirmRowRemoval(row: object): boolean {
  const populated = Object.entries(row).some(
    ([key, value]) =>
      !['id', 'category', 'period'].includes(key) && typeof value === 'string' && value.trim(),
  );
  return !populated || window.confirm('سيتم حذف هذا البند وبياناته. هل تريد المتابعة؟');
}
export function focusLastRow(): void {
  requestAnimationFrame(() => {
    const rows = document.querySelectorAll('.row-card');
    (rows.item(rows.length - 1)?.querySelector('input,select') as HTMLElement | null)?.focus();
  });
}
