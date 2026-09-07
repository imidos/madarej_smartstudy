import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'study' },
  { path: 'study', loadComponent: () => import('./study/wizard/wizard').then((m) => m.Wizard) },
  { path: '**', redirectTo: 'study' },
];
