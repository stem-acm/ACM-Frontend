import { TestBed } from '@angular/core/testing';

import { CheckinService } from './checkin.service';
import { unitTestProviders } from '@/testing/unit-test-providers';

describe('CheckinService', () => {
  let service: CheckinService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: unitTestProviders });
    service = TestBed.inject(CheckinService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
