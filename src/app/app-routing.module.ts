import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TemplateManagerComponent } from './components/template-manager/template-manager.component';
import { ViewerComponent } from './components/viewer/viewer.component';

const routes: Routes = [
  { path: 'templates', component: TemplateManagerComponent },
  { path: 'viewer', component: ViewerComponent },
  { path: '', redirectTo: 'templates', pathMatch: 'full' },
  { path: '**', redirectTo: 'templates' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { bindToComponentInputs: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
