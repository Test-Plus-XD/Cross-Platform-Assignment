import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ArticlesPageRoutingModule } from './articles-routing.module';
import { ArticlesPage } from './articles.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonicModule,
    ArticlesPageRoutingModule,
  ],
  declarations: [ArticlesPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ArticlesPageModule {}
