import { Component, inject } from '@angular/core';
import { Vehicle } from '../vehicle';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vehicle-selection',
  imports: [FormsModule],
  templateUrl: './vehicle-selection.html',
  styleUrl: './vehicle-selection.scss'
})
export class VehicleSelection  {

 public vehicleService= inject(Vehicle);

  vehicle = this.vehicleService.vehicle;
  selectedVehicle = this.vehicleService.selectedVehicle;
  quantity = this.vehicleService.quantity;
  total = this.vehicleService.total;
  color = this.vehicleService.color;
  constructor(){
     
  }
}
