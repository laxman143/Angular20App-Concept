import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, linkedSignal, resource, signal, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Vehicle {
  private vehicleUrl = "https://swapi.py4e.com/api/vehicles";

  private http = inject(HttpClient)

  vehicle = signal<Vehicle[]>([]);
  selectedVehicle = signal<Vehicle | undefined>(undefined);
  quantity = linkedSignal({
    source: this.selectedVehicle,
    computation: (v) => {
      if(v) {
        return 1
      }
      return 0;
    }
  }) 
  
  total = computed(() => (this.selectedVehicle()?.cost_in_credits ?? 0 ) * this.quantity());
  color = computed(() => this.total() > 50000 ? 'green' : 'blue');

  // vehicleResource = rxResource({
  //   stream : () => this.http.get<VehicleResponse>(this.vehicleUrl).pipe(map(vr=>vr.results))
  // });

  vehicleResource = resource({
    loader: async () => {
      const response = await this.http.get<{ results: any[] }>(this.vehicleUrl).toPromise();
      return response?.results;
    }
})

  vehicles = computed(() => this.vehicleResource.value() ?? [] as Vehicle[]);
 
  constructor() {
   
   }
}

export interface VehicleResponse {
  count:number;
  next:string;
  previous:string;
  results: Vehicle[];
}

export interface Vehicle{
  name: string;
  cost_in_credits: number;
}