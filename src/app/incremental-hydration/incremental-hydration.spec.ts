import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncrementalHydration } from './incremental-hydration';

describe('IncrementalHydration', () => {
  let component: IncrementalHydration;
  let fixture: ComponentFixture<IncrementalHydration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncrementalHydration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncrementalHydration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
