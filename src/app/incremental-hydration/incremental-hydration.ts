import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-incremental-hydration',
  imports: [CommonModule],
  templateUrl: './incremental-hydration.html',
  styleUrl: './incremental-hydration.scss'
})
export class IncrementalHydration {
users: User[] = [
    { id: 1, name: 'Alice', gender: 'Female', age: 28 },
    { id: 2, name: 'Bob', gender: 'Male', age: 32 },
    { id: 3, name: 'Charlie', gender: 'Male', age: 24 },
    { id: 4, name: 'Diana', gender: 'Female', age: 29 }
  ];
}
interface User {
  id: number;
  name: string;
  gender: string;
  age: number;
}