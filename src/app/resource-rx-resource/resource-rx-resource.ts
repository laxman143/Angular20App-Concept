import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, resource } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';


@Component({
  selector: 'app-resource-rx-resource',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resource-rx-resource.html',
  styleUrl: './resource-rx-resource.scss',
  
})
export class ResourceRxResource {
  private vehicleUrl = "https://swapi.py4e.com/api/vehicles";
  httpClient = inject(HttpClient);

  //  products = resource({
  //   loader: async () => {
  //     const response = await this.httpClient.get<{ results: any[] }>(this.vehicleUrl).toPromise();
  //     return response?.results;
  //   }})

    // products1 = rxResource({
    //   loader : async() => this.httpClient.get<any>(this.vehicleUrl)
    // })
  
  // products = rxResource(() => this.httpClient.get<{ results: any[] }>(this.vehicleUrl));
  //  products = resource({
  //   loader: () => this.httpClient.get<{ results: any[] }>(this.vehicleUrl)
  // });
//   products = rxResource(() => this.httpClient.get(this.vehicleUrl), {
//   from: 'manual'
// });
}
