import { Component, computed, inject, output } from '@angular/core';
import { StudyStore } from '../../study-store';
import { ASSET_CATEGORIES, EXPENSE_CATEGORIES, SECTORS, STEPS } from '../../study-model';
import { COUNTRIES, PERIODS } from '../../options';

interface ReviewGroup {
  title: string;
  entries: { label: string; value: string }[];
}
@Component({
  selector: 'app-review',
  template: `
    <div class="info-note">
      راجع البيانات والمبالغ بعملة {{ store.data().project.currency }}. يمكنك العودة إلى أي قسم
      لتعديله قبل الحفظ.
    </div>
    <div class="summary-metrics">
      <div>
        <span>الاستثمار المبدئي</span><strong>{{ store.format(store.totals().investment) }}</strong>
      </div>
      <div>
        <span>التشغيل الثابت / شهر</span
        ><strong>{{ store.format(store.totals().operating) }}</strong>
      </div>
      <div>
        <span>التمويل المطلوب</span><strong>{{ store.format(store.totals().borrowing) }}</strong>
      </div>
    </div>
    @for (section of sections(); track $index; let i = $index) {
      <section class="review-section">
        <header>
          <h3>
            <span class="review-number">{{ i + 1 }}</span
            >{{ steps[i].title }}
          </h3>
          <button
            class="text-button"
            type="button"
            (click)="edit.emit(i)"
            [attr.aria-label]="'تعديل ' + steps[i].title"
          >
            تعديل <span aria-hidden="true">↗</span>
          </button>
        </header>
        @for (group of section; track $index) {
          @if (group.title) {
            <h4>{{ group.title }}</h4>
          }
          <dl class="review-grid">
            @for (entry of group.entries; track $index) {
              <div>
                <dt>{{ entry.label }}</dt>
                <dd>{{ entry.value || 'لم يُحدد' }}</dd>
              </div>
            }
          </dl>
        }
      </section>
    }
    <div class="info-note">
      <strong>الحفظ على هذا الجهاز فقط</strong>
      <p>
        ستبقى بياناتك متاحة في هذا المتصفح. لم يتم إرسالها أو إنشاء تقرير بعد. يمكنك تعديلها في أي
        وقت.
      </p>
    </div>
  `,
})
export class Review {
  readonly store = inject(StudyStore);
  readonly edit = output<number>();
  readonly steps = STEPS;
  private group(title: string, entries: Record<string, string>): ReviewGroup {
    return { title, entries: Object.entries(entries).map(([label, value]) => ({ label, value })) };
  }
  private label(value: string, options: readonly { value: string; label: string }[]): string {
    return options.find((o) => o.value === value)?.label ?? value;
  }
  readonly sections = computed(() => {
    const d = this.store.data(),
      g = this.group.bind(this),
      label = this.label.bind(this);
    return [
      [
        g('', {
          'اسم المشروع': d.project.name,
          القطاع: label(d.project.sector, SECTORS),
          النشاط: d.project.activity,
          الدولة: label(d.project.country, COUNTRIES),
          المدينة: d.project.city,
          العملة: d.project.currency,
          'مدة الدراسة': d.project.years + ' سنوات',
          'فكرة المشروع': d.project.description,
          'شعار المشروع': this.store.logo()?.name ?? 'لم يُرفق شعار',
        }),
      ],
      [
        g('', {
          العملاء: d.market.customers,
          'قنوات البيع': d.market.channels,
          'الميزة التنافسية': d.market.advantages,
        }),
        ...(d.market.none
          ? [g('', { المنافسون: 'لا يوجد منافسون محددون حالياً' })]
          : d.market.competitors.map((r, i) =>
              g('المنافس ' + (i + 1), { الاسم: r.name, 'نقاط القوة': r.strength }),
            )),
      ],
      [
        g('', {
          'الموقع والمرافق': d.operations.facilities,
          'المساحة (م²)': d.operations.area,
          'المرافق والطاقة': d.operations.utilities,
          'خطوات التشغيل': d.operations.process,
          ...(d.project.sector === 'manufacturing'
            ? { 'الطاقة الإنتاجية': d.operations.capacity }
            : {}),
          المواد: d.operations.materials,
          الموردون: d.operations.suppliers,
          التراخيص: d.operations.permits,
          'السلامة والبيئة': d.operations.safety,
          التدريب: d.operations.training,
        }),
      ],
      d.staff.none
        ? [g('', { 'فريق العمل': 'لا يوجد موظفون بأجر' })]
        : d.staff.items.map((r, i) =>
            g('الوظيفة ' + (i + 1), {
              المسمى: r.role,
              العدد: r.count,
              'الراتب الشهري للفرد': r.salary,
              'الإضافات الشهرية للفرد': r.additional,
            }),
          ),
      d.products.items.map((r, i) =>
        g('المنتج أو الخدمة ' + (i + 1), {
          الاسم: r.name,
          'سعر البيع شامل الضريبة': r.price,
          'ضريبة المبيعات (%)': r.tax,
          'المبيعات / شهر': r.sales,
          'القدرة / شهر': r.capacity,
          'النمو السنوي (%)': r.growth,
          'مواد / وحدة': r.materials,
          'عمالة إضافية / وحدة': r.labor,
          'عمولات / وحدة': r.commissions,
          'تغليف / وحدة': r.packaging,
          'أخرى / وحدة': r.other,
        }),
      ),
      d.expenses.none
        ? [g('', { المصروفات: 'لا توجد مصروفات إضافية' })]
        : d.expenses.items.map((r, i) =>
            g('المصروف ' + (i + 1), {
              الفئة: label(r.category, EXPENSE_CATEGORIES),
              الوصف: r.name,
              المبلغ: r.amount,
              الدورية: label(r.period, PERIODS),
            }),
          ),
      [
        ...(d.investment.none
          ? [g('', { الأصول: 'لا توجد أصول أو نفقات تأسيس' })]
          : d.investment.items.map((r, i) =>
              g('البند ' + (i + 1), {
                الفئة: label(r.category, ASSET_CATEGORIES),
                الوصف: r.name,
                الكمية: r.quantity,
                'تكلفة الوحدة': r.cost,
              }),
            )),
        g('مبالغ الانطلاق', {
          الودائع: d.investment.deposits,
          'المخزون الأولي': d.investment.inventory,
          'احتياطي رأس المال العامل': d.investment.reserve,
        }),
      ],
      [
        g('', {
          'التمويل الذاتي': d.financing.contribution,
          'الاقتراض المطلوب': this.store.format(this.store.totals().borrowing),
          ...(this.store.totals().borrowing.gt(0)
            ? {
                'الفائدة السنوية (%)': d.financing.interest,
                'رسوم الاقتراض المقدمة': d.financing.fees,
                'مدة السداد بالسنوات': d.financing.years,
                'القسط الشهري التقديري': this.store.format(this.store.totals().installment),
              }
            : {}),
        }),
      ],
    ];
  });
}
