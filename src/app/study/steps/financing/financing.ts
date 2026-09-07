import { Component, inject } from '@angular/core';
import { StudyField } from '../../ui/study-field/study-field';
import { StudyStore } from '../../study-store';
@Component({
  selector: 'app-financing',
  imports: [StudyField],
  template: `
    <div class="finance-highlight">
      <span>الاستثمار المطلوب لبدء مشروعك</span
      ><strong>{{ store.format(store.totals().investment) }}</strong
      ><small>الأصول + الودائع + المخزون الأولي + احتياطي رأس المال العامل</small>
    </div>
    <div class="fields-grid">
      <app-study-field
        id="financing-contribution"
        label="التمويل الذاتي من الشركاء"
        [field]="f.contribution"
        kind="number"
        [suffix]="store.data().project.currency"
        hint="أدخل قيمة مساهمتك، بما لا يتجاوز إجمالي الاستثمار."
      />
      <div class="calculated-field">
        <span>مبلغ الاقتراض المطلوب</span
        ><strong>{{ store.format(store.totals().borrowing) }}</strong
        ><small>الفرق بين الاستثمار المطلوب والتمويل الذاتي</small>
      </div>
    </div>
    @if (store.totals().borrowing.gt(0)) {
      <div class="section-divider"></div>
      <h3>افتراضات الاقتراض</h3>
      <div class="fields-grid">
        <app-study-field
          id="financing-interest"
          label="معدل الفائدة السنوي"
          [field]="f.interest"
          kind="number"
          suffix="%"
          hint="أدخل صفراً للتمويل دون فوائد."
        />
        <app-study-field
          id="financing-years"
          label="مدة السداد بالسنوات"
          [field]="f.years"
          kind="number"
          suffix="سنة"
        />
        <app-study-field
          id="financing-fees"
          label="رسوم الاقتراض المدفوعة مقدماً"
          [field]="f.fees"
          kind="number"
          [suffix]="store.data().project.currency"
        />
      </div>
      <div class="total-strip">
        <span>القسط الشهري التقديري</span
        ><strong>{{ store.format(store.totals().installment) }}</strong>
      </div>
      <p class="fine-print">
        تقدير بأقساط شهرية متساوية وفائدة ثابتة على الرصيد المتناقص، دون فترة سماح. رسوم الاقتراض
        تُدفع منفصلة ولا تُضاف إلى أصل القرض أو القسط. أدخل بيانات عرض التمويل الفعلي عند توفره.
      </p>
    } @else {
      <div class="info-note">
        يغطي التمويل الذاتي الاستثمار المطلوب؛ لا توجد حاجة إلى اقتراض وفق هذه الأرقام.
      </div>
    }
  `,
})
export class Financing {
  readonly store = inject(StudyStore);
  readonly f = this.store.form.financing;
}
