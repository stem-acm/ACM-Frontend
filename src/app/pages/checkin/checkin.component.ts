import { Component } from '@angular/core';
import { StepperComponent } from '../../components/stepper/stepper.component';

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [StepperComponent],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.css',
})
export class CheckinComponent {}
