import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourceRxResource } from './resource-rx-resource';

describe('ResourceRxResource', () => {
  let component: ResourceRxResource;
  let fixture: ComponentFixture<ResourceRxResource>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceRxResource]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResourceRxResource);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
