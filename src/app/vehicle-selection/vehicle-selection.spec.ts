import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleSelection } from './vehicle-selection';

describe('VehicleSelection', () => {
  let component: VehicleSelection;
  let fixture: ComponentFixture<VehicleSelection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleSelection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleSelection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
