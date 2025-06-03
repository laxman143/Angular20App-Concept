import { Component, linkedSignal, signal } from '@angular/core';

@Component({
  selector: 'app-linked-signal',
  imports: [],
  templateUrl: './linked-signal.html',
  styleUrl: './linked-signal.scss'
})
export class LinkedSignal {

  firstname = signal("Laxman");
  lastName= signal("Prajapati")

  fullName = linkedSignal({
      source: this.firstname,
      computation : (newOptions,previousOptions) => {
        const fullName = newOptions + " " + this.lastName();
        return fullName
      }
  })

  changeName(){
    this.firstname.set("Niva")
  }

  user= signal({id: 111, name:"Laxman"});
  email = linkedSignal({
    source: this.user,
    computation: (user) => { 
      return `${user.name}${user.id}@gmail.com`
     },
     equal: (a:any, b:any) => a.id === b.id
  })

  changeEmail() {
    this.user.set({id: 222, name:"Niva"});
  }
}
