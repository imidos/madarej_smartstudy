import { Component, effect, ElementRef, input, viewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { ReportChartData } from './chart-data';
Chart.register(...registerables);
const colors = ['#37316b', '#2d7f79', '#ad7833', '#7160a4', '#aa4253', '#4772a3'];
export function createChart(
  canvas: HTMLCanvasElement,
  data: ReportChartData,
  exporting = false,
): Chart {
  return new Chart(canvas, {
    type: data.type,
    data: {
      labels: data.labels,
      datasets: data.series.map((s, i) => ({
        label: s.label,
        data: s.values,
        backgroundColor: data.type === 'doughnut' ? colors : colors[i % colors.length],
        borderColor: colors[i % colors.length],
        borderWidth: 2,
        pointStyle: ['circle', 'rect', 'triangle'][i % 3],
      })),
    },
    options: {
      responsive: !exporting,
      maintainAspectRatio: false,
      animation: false,
      devicePixelRatio: exporting ? 2 : 1,
      locale: 'ar-SA',
      plugins: {
        legend: {
          labels: { font: { family: 'Tajawal' }, usePointStyle: true },
          rtl: true,
          textDirection: 'rtl',
        },
      },
      ...(data.type !== 'doughnut'
        ? {
            scales: {
              y: { beginAtZero: true, ticks: { font: { family: 'Tajawal' } } },
              x: { ticks: { font: { family: 'Tajawal' } } },
            },
          }
        : {}),
    },
  });
}
@Component({
  selector: 'app-report-chart',
  template: `
    <figure class="report-chart">
      <figcaption>
        <h3>{{ data().title }}</h3>
        <p>{{ data().description }}</p>
      </figcaption>
      <div class="chart-canvas">
        <canvas
          #canvas
          role="img"
          [attr.aria-label]="data().title + ' — جدول البيانات أسفل الرسم'"
        ></canvas>
      </div>
      <details>
        <summary>عرض بيانات الرسم</summary>
        <div class="table-scroll">
          <table>
            <caption>
              {{
                data().title
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">البند</th>
                @for (s of data().series; track s.label) {
                  <th scope="col">{{ s.label }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (label of data().labels; track $index; let i = $index) {
                <tr>
                  <th scope="row">{{ label }}</th>
                  @for (s of data().series; track s.label) {
                    <td>{{ format(s.values[i]) }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  `,
})
export class ReportChart {
  readonly data = input.required<ReportChartData>();
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  constructor() {
    effect((cleanup) => {
      const chart = createChart(this.canvas().nativeElement, this.data());
      cleanup(() => chart.destroy());
    });
  }
  format(value: number): string {
    return new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(value);
  }
}
