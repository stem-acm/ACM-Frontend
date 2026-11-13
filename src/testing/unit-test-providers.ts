import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/** Providers that most components and services need in a unit test: HTTP (no real calls), router, translations. */
export const unitTestProviders = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
  importProvidersFrom(TranslateModule.forRoot()),
];
