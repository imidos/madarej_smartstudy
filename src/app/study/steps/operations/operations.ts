import { Component, inject } from '@angular/core';
import { StudyField } from '../../ui/study-field/study-field';
import { StudyStore } from '../../study-store';
@Component({
  selector: 'app-operations',
  imports: [StudyField],
  template: `
    <div class="info-note">
      صف المتطلبات التشغيلية لمشروعك. اكتب «لا ينطبق» عندما لا يحتاج نشاطك إلى أحد المتطلبات.
    </div>
    <div class="fields-grid">
      <app-study-field
        id="operations-facilities"
        label="الموقع والمرافق المطلوبة"
        [field]="f.facilities"
        kind="textarea"
        placeholder="مكتب، متجر، مستودع، أو عمل عن بُعد…"
      />
      <app-study-field
        id="operations-utilities"
        label="احتياجات المرافق والطاقة"
        [field]="f.utilities"
        kind="textarea"
        placeholder="الكهرباء، المياه، الإنترنت…"
      />
      <app-study-field
        id="operations-area"
        label="المساحة المطلوبة بالمتر المربع"
        [field]="f.area"
        kind="number"
        suffix="م²"
        hint="أدخل صفراً إذا كان النشاط لا يحتاج إلى مقر."
      />
      <app-study-field
        class="full-width"
        id="operations-process"
        label="خطوات الإنتاج أو تقديم الخدمة"
        [field]="f.process"
        kind="textarea"
        placeholder="من استلام الطلب وحتى تسليمه للعميل…"
      />
      @if (store.data().project.sector === 'manufacturing') {
        <app-study-field
          class="full-width"
          id="operations-capacity"
          label="الطاقة الإنتاجية وطريقة تشغيلها"
          [field]="f.capacity"
          kind="textarea"
          placeholder="الوحدات المنتجة، ساعات العمل، وعدد الورديات…"
        />
      }
      <app-study-field
        id="operations-materials"
        label="المواد والمستلزمات"
        [field]="f.materials"
        kind="textarea"
        [required]="store.data().project.sector === 'manufacturing'"
      />
      <app-study-field
        id="operations-suppliers"
        label="الموردون وموثوقية التوريد"
        [field]="f.suppliers"
        kind="textarea"
        [required]="store.data().project.sector === 'manufacturing'"
      />
      <app-study-field
        id="operations-permits"
        label="التراخيص والمتطلبات النظامية"
        [field]="f.permits"
        kind="textarea"
        hint="اذكر المتطلبات المعروفة لك. لا نفترض تشريعات بناءً على الدولة المختارة."
      />
      <app-study-field
        id="operations-safety"
        label="اشتراطات السلامة والبيئة"
        [field]="f.safety"
        kind="textarea"
      />
      <app-study-field
        class="full-width"
        id="operations-training"
        label="المهارات وخطة التدريب"
        [field]="f.training"
        kind="textarea"
      />
    </div>
  `,
})
export class Operations {
  readonly store = inject(StudyStore);
  readonly f = this.store.form.operations;
}
