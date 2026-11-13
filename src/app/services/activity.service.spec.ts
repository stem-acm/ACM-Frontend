import { TestBed } from '@angular/core/testing';

import { ActivityService } from './activity.service';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: unitTestProviders });
    service = TestBed.inject(ActivityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
