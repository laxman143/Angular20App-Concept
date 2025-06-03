import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-signal',
  imports: [CommonModule],
  templateUrl: './signal.html',
  styleUrl: './signal.scss'
})
export class Signal {
 protected title = 'Angular20App';
 private http = inject(HttpClient);

  counter = signal(0);
  firstCounter = signal(0);
  secondCounter = signal(0);
  finalCounter = computed(()=> this.firstCounter() + this.secondCounter())
  private hasLoaded = false;
  //this code convet observablt to toSignal
  vehicles = toSignal(
    this.http.get<{results :any[]}>('https://swapi.py4e.com/api/vehicles'),
    {initialValue :{results : []}}
  )


  constructor(){
    effect(()=> {
      console.log("counter", this.counter())
      console.log("finalCounter ", this.finalCounter())
      const data = this.vehicles();
      if(!this.hasLoaded && data.results.length > 0){
        this.hasLoaded =  true
         console.log('🚗 Vehicles loaded:', data.results);
      }
      
    })
  }

  ngOnInit(){
    
  }
  increment() {
    // this.counter.update(value => value + 1);
    this.counter.set(this.counter() + 1);
    this.firstCounter.set(10);
    this.secondCounter.set(20);
  }

}
