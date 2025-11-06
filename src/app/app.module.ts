import { NgModule, isDevMode} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared/shared.module'; // Import the SharedModule for header/footer
import { HttpClientModule } from '@angular/common/http';

import { register } from 'swiper/element/bundle';
register(); // Register custom elements globally so <swiper-container> works

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    SharedModule,
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'}
    )],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
  bootstrap: [AppComponent],
  //schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}