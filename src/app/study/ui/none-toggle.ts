import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
@Component({
  selector: 'app-none-toggle',
  imports: [FormField],
  template: `<label class="none-toggle"
    ><input type="checkbox" [formField]="field()" /><span
      >{{ label()
      }}<small>لن تُحتسب هذه الفئة ضمن الدراسة. تبقى بنودها محفوظة إذا أعدت تفعيلها.</small></span
    ></label
  >`,
})
export class NoneToggle {
  readonly field = input.required<FieldTree<boolean>>();
  readonly label = input.required<string>();
}
