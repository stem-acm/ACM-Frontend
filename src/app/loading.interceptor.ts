import { HttpInterceptorFn } from '@angular/common/http';
import { LoadingService } from './services/loading.service';
import { inject } from '@angular/core';
import { delay, finalize } from 'rxjs';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  loadingService.busy();

  return next(req).pipe(
    delay(1500),
    finalize(() => loadingService.idle()),
  );
};
