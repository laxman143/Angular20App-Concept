import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResourceApiService {
 private vehicleUrl = 'https://swapi.py4e.com/api/vehicles';

 vehicleModels = signal<string[]>([
  'landspeeder', 'airspeeder', 'bomber', 'transport',
      'crawler', 'skyhopper', 'starfighter', 'barge'
 ])
 selectedModel= signal<string>('')
  constructor() { }

  // private vehiclesResource = httpResource<VehicleResponse>(()=> `${this.vehicleUrl}?search=${this.selectedModel()}`);

  // Alternative way call API 
  private vehiclesResource = httpResource<VehicleResponse>(()=> ({
    url: this.vehicleUrl,
    method: 'GET',
    headers: {
      'accept': 'application/json'
    },
    params: {
      search: this.selectedModel()
    }
  }));


  vehicles = computed(() => this.vehiclesResource.value()?.results ?? [] as Vehicle[]);
  error = computed(() => this.vehiclesResource.error() as HttpErrorResponse);
   isLoading = this.vehiclesResource.isLoading;
}
  


export interface VehicleResponse {
   count: number;
   next: string;
   previous: string;
   results: Vehicle[]
}

export interface Vehicle {
   name: string;
   
   cost_in_credits: number;
   model: string;
}
