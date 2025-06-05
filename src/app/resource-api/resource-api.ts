import { Component, inject } from '@angular/core';
import { ResourceApiService } from '../resource-api-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-resource-api',
  imports: [CommonModule,FormsModule],
  templateUrl: './resource-api.html',
  styleUrl: './resource-api.scss'
})
export class ResourceApi {

  pageTitle = 'Resource API Example';

  private vehicleService = inject(ResourceApiService);

  vehicles = this.vehicleService.vehicles;
  isLoading = this.vehicleService.isLoading;
  error = this.vehicleService.error;

  vehicleModels = this.vehicleService.vehicleModels;
  selectedModel = this.vehicleService.selectedModel;
}
