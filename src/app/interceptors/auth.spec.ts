import { TestBed } from '@angular/core/testing';

import { AuthInterceptor } from './auth';

describe('AuthInterceptor', () => {
  let service: AuthInterceptor;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AuthInterceptor] });
    service = TestBed.inject(AuthInterceptor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
