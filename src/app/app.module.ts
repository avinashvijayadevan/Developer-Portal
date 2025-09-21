import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TemplateManagerComponent } from './components/template-manager/template-manager.component';
import { ViewerComponent } from './components/viewer/viewer.component';

@NgModule({
  declarations: [AppComponent, TemplateManagerComponent, ViewerComponent],
  imports: [BrowserModule, FormsModule, ReactiveFormsModule, RouterModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
