import { TestBed } from '@angular/core/testing';

import { DashboardService } from './dashboard.service';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: unitTestProviders });
    service = TestBed.inject(DashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
