import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TestPage } from './test.page';

const buildTestRoute = (
  path: 'a' | 'b' | 'c',
  label: string,
  descriptionEn: string,
  descriptionTc: string,
) => ({
  path,
  component: TestPage,
  data: {
    title: { Header_EN: `Test ${label}`, Header_TC: `測試 ${label}` },
    debugLabel: `Test ${label}`,
    debugDescription_EN: descriptionEn,
    debugDescription_TC: descriptionTc,
  },
});

const routes: Routes = [
  {
    path: '',
    redirectTo: 'a',
    pathMatch: 'full',
  },
  buildTestRoute(
    'a',
    'A',
    'Public navigation smoke test with routerLink buttons.',
    '使用 routerLink 按鈕的公開導航煙霧測試。',
  ),
  buildTestRoute(
    'b',
    'B',
    'Imperative navigation smoke test with navigateByUrl().',
    '使用 navigateByUrl() 的命令式導航煙霧測試。',
  ),
  buildTestRoute(
    'c',
    'C',
    'Cross-route APK verification page for blank-screen regressions.',
    '用於 APK 空白畫面回歸驗證的跨路由測試頁。',
  ),
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TestPageRoutingModule {}
