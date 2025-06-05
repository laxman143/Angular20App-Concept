import { Directive, effect, HostBinding, Input, signal } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  host: {
    '[class.highlighted]': 'isActive',
    '[attr.data-status]': 'status',
    '[tabIndex]': 'myTabIndex',       // New signal for tabIndex
    '(click)': 'handleClick()',      // HostListener equivalent
    '(focus)': 'handleFocus()',
    '(mouseenter)': 'moustHover()', 
    '(mouseleave)': 'moustLeave()'
  }
})
export class Highlight {
  @Input() isActive: boolean = false;
  @Input() status: string = 'inactive';
  
// Example with a Signal
  myTabIndex = signal(0);
  constructor() {
    // This effect ensures myTabIndex updates based on isActive (example logic)
    // effect(() => {
    //   this.myTabIndex.set(this.isActive ? 0 : -1);
    // }, { allowSignalWrites: true });
  }

   handleClick() {
    console.log('Host element clicked!');
    this.isActive = !this.isActive; // Toggle for demonstration
  }
  moustHover(){
     this.isActive = true;
  }

  moustLeave(){
    this.isActive = false;
  }

  handleFocus() {
    console.log('Host element focused!');
  }

  // @HostBinding('class.highlighted') get highlightClass() {
  //   return this.isActive; // Typo: 'isActve'
  // }

  // @HostBinding('attr.data-status') get dataStatus() {
  //   return this.status; // Typo: 'sttus'
  // }

  //  @HostBinding('Value') someValue: string = 'test'; // 'value' is not a standard property of <div>
}
