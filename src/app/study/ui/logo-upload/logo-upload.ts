import { Component, effect, inject, signal } from '@angular/core';
import { StudyStore } from '../../study-store';

@Component({
  selector: 'app-logo-upload',
  template: `
    <div class="logo-upload">
      <div class="logo-placeholder">
        @if (preview()) {
          <img [src]="preview()" alt="معاينة شعار المشروع" width="58" height="58" />
        } @else {
          <svg
            viewBox="0 0 24 24"
            width="27"
            height="27"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8" cy="8" r="1.5" />
            <path d="m3 17 6-6 4 4 3-3 5 5" />
          </svg>
        }
      </div>
      <div class="logo-details">
        <strong>شعار المشروع <span class="optional">اختياري</span></strong>
        <p>{{ store.logo()?.name || 'أضف لمستك إلى دراسة مشروعك' }}</p>
        <small id="logo-help">PNG أو JPG أو WebP · بحد أقصى ٢ ميجابايت</small>
      </div>
      <div class="logo-actions">
        <label class="button secondary upload-button" for="logo-file">{{
          processing() ? 'جارٍ الفحص…' : store.logo() ? 'تغيير الشعار' : 'رفع الشعار'
        }}</label>
        <input
          class="visually-hidden"
          type="file"
          id="logo-file"
          accept="image/png,image/jpeg,image/webp"
          aria-describedby="logo-help logo-error"
          [disabled]="processing()"
          (change)="choose($event)"
        />
        @if (store.logo()) {
          <button type="button" class="text-button danger" (click)="store.logo.set(undefined)">
            إزالة
          </button>
        }
      </div>
    </div>
    <p id="logo-error" class="field-error" role="status">{{ error() }}</p>
  `,
})
export class LogoUpload {
  readonly store = inject(StudyStore);
  readonly preview = signal('');
  readonly error = signal('');
  readonly processing = signal(false);
  constructor() {
    effect((cleanup) => {
      const logo = this.store.logo();
      const url = logo ? URL.createObjectURL(logo.blob) : '';
      this.preview.set(url);
      cleanup(() => {
        if (url) URL.revokeObjectURL(url);
      });
    });
  }
  async choose(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set('');
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024 ||
      !file.size
    ) {
      this.error.set('اختر صورة PNG أو JPG أو WebP سليمة لا تتجاوز ٢ ميجابايت.');
      return;
    }
    this.processing.set(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 25000000)
        throw new Error('image-size');
      this.store.logo.set({
        name: file.name.slice(0, 255),
        type: file.type,
        size: file.size,
        blob: file,
      });
    } catch {
      this.error.set('تعذر قراءة الصورة. جرّب صورة أخرى بحجم وأبعاد أصغر.');
    } finally {
      URL.revokeObjectURL(url);
      this.processing.set(false);
    }
  }
}
