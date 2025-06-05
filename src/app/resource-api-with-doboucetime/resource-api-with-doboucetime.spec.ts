import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourceApiWithDoboucetime } from './resource-api-with-doboucetime';

describe('ResourceApiWithDoboucetime', () => {
  let component: ResourceApiWithDoboucetime;
  let fixture: ComponentFixture<ResourceApiWithDoboucetime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceApiWithDoboucetime]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResourceApiWithDoboucetime);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
