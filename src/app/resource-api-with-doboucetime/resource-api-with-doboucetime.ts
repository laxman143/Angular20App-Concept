import { Component, inject } from '@angular/core';
import { ResourceApiWithDbouncetimeService } from '../resource-api-with-dbouncetime-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-resource-api-with-doboucetime',
  imports: [CommonModule,FormsModule],
  templateUrl: './resource-api-with-doboucetime.html',
  styleUrl: './resource-api-with-doboucetime.scss'
})
export class ResourceApiWithDoboucetime {
   pageTitle = "StarWars Vehicles";

   // Injected services
   private vehicleService = inject(ResourceApiWithDbouncetimeService);

   // Signals to support the template
   vehicles = this.vehicleService.vehicles;
   isLoading = this.vehicleService.isLoading;
   enteredModel = this.vehicleService.enteredSearch;
}
