import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@/app/services/auth.service';

export const permissionGuard: CanActivateFn = async route => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    await firstValueFrom(auth.verifyToken());
    const feature = route.data['permission'] as string;
    return auth.can(feature) ? true : router.parseUrl(auth.firstAllowedRoute());
  } catch {
    return router.parseUrl('/auth');
  }
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    await firstValueFrom(auth.verifyToken());
    const destination = auth.firstAllowedRoute();
    return destination === '/auth' ? true : router.parseUrl(destination);
  } catch {
    return true;
  }
};
