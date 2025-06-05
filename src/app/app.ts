import { Component, computed, effect, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VehicleSelection } from './vehicle-selection/vehicle-selection';
import { single } from 'rxjs';
import { Signal } from './signal/signal';
import { LinkedSignal } from './linked-signal/linked-signal';
import { Highlight } from './directives/highlight';
import { ResourceApi } from './resource-api/resource-api';
import { ResourceApiWithDoboucetime } from './resource-api-with-doboucetime/resource-api-with-doboucetime';
import { SignalForms } from './signal-forms/signal-forms';

// VehicleSelection
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,Signal,LinkedSignal,VehicleSelection,Highlight,ResourceApi,SignalForms,ResourceApiWithDoboucetime],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Angular20App';

  counter = signal(0);
  firstCounter = signal(0);
  secondCounter = signal(0);
  finalCounter = computed(()=> this.firstCounter() + this.secondCounter())
  
  constructor(){
    effect(()=> {
      console.log("counter", this.counter())
      console.log("finalCounter ", this.finalCounter())
    })
  }
  increment() {
    // this.counter.update(value => value + 1);
    this.counter.set(this.counter() + 1);
    this.firstCounter.set(10);
    this.secondCounter.set(20);
  }
}
