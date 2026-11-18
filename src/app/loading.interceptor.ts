import { HttpInterceptorFn } from '@angular/common/http';
import { LoadingService } from './services/loading.service';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { BACKGROUND_REQUEST } from './services/member-photo.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(BACKGROUND_REQUEST)) return next(req);

  const loadingService = inject(LoadingService);

  loadingService.busy();

  return next(req).pipe(finalize(() => loadingService.idle()));
};
