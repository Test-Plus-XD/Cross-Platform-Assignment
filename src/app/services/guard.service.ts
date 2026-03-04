import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    // Wait for Firebase to finish restoring the persisted auth session before checking state.
    // Without this, the BehaviorSubject's initial null value causes spurious redirects to /login.
    return this.authService.authInitialized$.pipe(
      filter(initialized => initialized),
      take(1),
      switchMap(() => this.authService.currentUser$.pipe(
        take(1),
        map(user => {
          if (user) {
            return true;
          } else {
            return this.router.createUrlTree(['/login'], {
              queryParams: { returnUrl: state.url }
            });
          }
        })
      ))
    );
  }
}