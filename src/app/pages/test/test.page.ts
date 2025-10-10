import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import SwiperCore from 'swiper';

@Component({
  selector: 'app-test',
  templateUrl: './test.page.html',
  styleUrls: ['./test.page.scss'],
  standalone: false,
})
export class TestPage implements AfterViewInit {
  // Sample slides are plain text strings
  slides: string[] = ['Slide one — hello', 'Slide two — greetings', 'Slide three — farewell'];

  // Minimal Swiper configuration; works with element API
  swiperConfig: any = {
    slidesPerView: 1,
    spaceBetween: 12,
    pagination: { clickable: true },
    navigation: false, // We will use our own button for demo
    loop: false
  };

  // Get a reference to the custom element <swiper-container>
  @ViewChild('swiperEl', { static: false }) swiperEl!: ElementRef;

  // Nothing heavy in constructor for this minimal example
  constructor() { }

  // After view is ready, attach event listener and optionally access internal swiper
  ngAfterViewInit(): void {
    const el = this.swiperEl.nativeElement as any; // Native swiper element (custom element)

    // Initialise configuration on the element and call initialise
    // This helps ensure the config is applied even if Angular rendered asynchronously
    Object.assign(el, this.swiperConfig);
    if (typeof el.initialize === 'function') {
      el.initialize();
    }

    // Listen to slide change events emitted by the Swiper element
    el.addEventListener('swiperslidechange', (ev: any) => {
      // Log active index for debugging
      // Use el.swiper to access the internal Swiper instance if needed
      console.log('Slide changed, activeIndex =', el.swiper ? el.swiper.activeIndex : 'unknown');
    });
  }

  // Called when the Next button is pressed; uses the internal swiper API
  next(): void {
    const el = this.swiperEl?.nativeElement as any;
    // Guard against missing initialisation
    if (el && el.swiper && typeof el.swiper.slideNext === 'function') {
      el.swiper.slideNext();
    } else {
      // Fallback: try to programmatically increment the internal index and update
      console.warn('Swiper not ready yet.');
    }
  }
}