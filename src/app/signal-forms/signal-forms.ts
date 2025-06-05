import { CommonModule, JsonPipe } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-signal-forms',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './signal-forms.html',
  styleUrl: './signal-forms.scss'
})
export class SignalForms {

  registrationForm =  new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(3)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  })

  usernameControl = this.registrationForm.controls.username;
  emailControl = this.registrationForm.controls.email;
  passwordControl = this.registrationForm.controls.password;

  formValue = signal(this.registrationForm.value); // This is a Signal<FormValue>
  formStatus = signal(this.registrationForm.status); // This is a Signal<FormControlStatus>

  isFormValid = computed(() => {  
    return this.formStatus() == 'VALID'
   });
  formSubmittedValue = signal<any | null>(null);

  constructor(){
     effect(() => {
      console.log('--- Form Value Changed (via Effect) ---');
      console.log('Current Form Value:', this.formValue());
      console.log('Current Form Status:', this.formStatus());
      console.log('Is Form Valid (from computed):', this.isFormValid());
    });
  }

  onSubmit(){
    this.registrationForm.markAllAsTouched(); // Mark all controls as touched
    if(this.registrationForm.valid){
      this.formSubmittedValue.set(this.formValue());
      this.registrationForm.reset(); // Optionally reset the form after submission
      this.formSubmittedValue.set(null);
    } else {
      console.log('Form is invalid. Please check errors.');
      this.formSubmittedValue.set(null);
    }
  }
}
