import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResourceApiWithDbouncetimeService {
   private vehicleUrl = 'https://swapi.py4e.com/api/vehicles';

   enteredSearch = signal<string>('');
   searchText$ = toObservable(this.enteredSearch).pipe(debounceTime(400))
   searchText = toSignal(this.searchText$)


    private vehiclesResource = httpResource<VehicleResponse>(() =>
      `${this.vehicleUrl}?search=${this.searchText()}`
   );
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