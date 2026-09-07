import { Component, inject } from '@angular/core';
import { StudyField } from '../../ui/study-field/study-field';
import { LogoUpload } from '../../ui/logo-upload/logo-upload';
import { StudyStore } from '../../study-store';
import { COUNTRIES, CURRENCIES, PROJECTION_YEARS } from '../../options';
import { SECTORS } from '../../study-model';

@Component({
  selector: 'app-overview',
  imports: [StudyField, LogoUpload],
  template: `
    <div class="section-heading">
      <h3>معلومات المشروع الأساسية</h3>
      <span>الحقول المعلّمة بـ <b class="required-mark">*</b> مطلوبة</span>
    </div>
    <div class="fields-grid">
      <app-study-field
        id="project-name"
        label="اسم المشروع"
        [field]="f.name"
        placeholder="مثال: مصنع آفاق للأثاث"
      />
      <app-study-field
        id="project-sector"
        label="قطاع المشروع"
        [field]="f.sector"
        kind="select"
        [options]="sectors"
      />
      <app-study-field
        id="project-activity"
        label="النشاط الرئيسي"
        [field]="f.activity"
        placeholder="مثال: تصنيع الأثاث المنزلي"
      />
      <app-study-field
        id="project-years"
        label="فترة الدراسة"
        [field]="f.years"
        kind="select"
        [options]="years"
      />
      <app-study-field
        id="project-country"
        label="دولة المشروع"
        [field]="f.country"
        kind="select"
        [options]="countries"
      />
      <app-study-field
        id="project-city"
        label="مدينة المشروع"
        [field]="f.city"
        placeholder="المدينة التي سيقام فيها المشروع"
      />
      <app-study-field
        id="project-currency"
        label="عملة الدراسة"
        [field]="f.currency"
        kind="select"
        [options]="currencies"
        hint="استخدم العملة المختارة لجميع المبالغ. تغييرها لا يحوّل القيم تلقائياً."
      />
      <div class="language-note">
        <span class="language-icon" aria-hidden="true">ع</span>
        <div>
          <strong>لغة الدراسة: العربية</strong>
          <p>خطوات واضحة، وبيانات بلغتك.</p>
        </div>
      </div>
      <app-study-field
        class="full-width"
        id="project-description"
        label="نبذة عن فكرة المشروع"
        [field]="f.description"
        kind="textarea"
        placeholder="ما فكرة مشروعك؟ وما الذي سيقدّمه لعملائه؟"
        hint="صف فكرتك بوضوح، بما يساعد على فهم طبيعة المشروع وأهدافه."
      />
    </div>
    <div class="section-divider"></div>
    <app-logo-upload />
  `,
})
export class Overview {
  readonly f = inject(StudyStore).form.project;
  readonly countries = COUNTRIES;
  readonly currencies = CURRENCIES;
  readonly years = PROJECTION_YEARS;
  readonly sectors = SECTORS;
}
