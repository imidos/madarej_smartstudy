import { Component, inject } from '@angular/core';
import { StudyField } from '../../ui/study-field/study-field';
import { NoneToggle } from '../../ui/none-toggle';
import { RowCard, confirmRowRemoval, focusLastRow } from '../../ui/row-card';
import { StudyStore } from '../../study-store';
import { newCompetitor } from '../../study-model';
@Component({
  selector: 'app-market',
  imports: [StudyField, NoneToggle, RowCard],
  template: `
    <div class="fields-grid">
      <app-study-field
        class="full-width"
        id="market-customers"
        label="من هم عملاؤك المستهدفون؟"
        [field]="f.customers"
        kind="textarea"
        placeholder="الفئة العمرية، الموقع، الاحتياجات، وطبيعة العملاء…"
      />
      <app-study-field
        id="market-channels"
        label="قنوات البيع والوصول للعملاء"
        [field]="f.channels"
        kind="textarea"
        placeholder="متجر، موقع إلكتروني، موزعون…"
      />
      <app-study-field
        id="market-advantages"
        label="الميزة التنافسية للمشروع"
        [field]="f.advantages"
        kind="textarea"
        placeholder="لماذا سيختار العميل مشروعك؟"
      />
    </div>
    <div class="section-divider"></div>
    <h3>المنافسون</h3>
    <app-none-toggle [field]="f.none" label="لا يوجد منافسون محددون حالياً" />
    @if (!f.none().value()) {
      @for (row of f.competitors; track row.id().value(); let i = $index) {
        <app-row-card [title]="'المنافس ' + (i + 1)" (remove)="remove(i)">
          <div class="fields-grid">
            <app-study-field
              [id]="'competitor-name-' + i"
              label="اسم المنافس"
              [field]="row.name"
            /><app-study-field
              [id]="'competitor-strength-' + i"
              label="نقاط قوة المنافس"
              [field]="row.strength"
            />
          </div>
        </app-row-card>
      }
      <button type="button" class="add-button" (click)="add()">＋ إضافة منافس</button>
    }
  `,
})
export class Market {
  readonly store = inject(StudyStore);
  readonly f = this.store.form.market;
  add() {
    this.store.data.update((d) => ({
      ...d,
      market: { ...d.market, competitors: [...d.market.competitors, newCompetitor()] },
    }));
    focusLastRow();
  }
  remove(i: number) {
    if (confirmRowRemoval(this.store.data().market.competitors[i]))
      this.store.data.update((d) => ({
        ...d,
        market: {
          ...d.market,
          competitors: d.market.competitors.filter((_, index) => index !== i),
        },
      }));
  }
}
