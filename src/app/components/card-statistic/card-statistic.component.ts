import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card-statistic',
  standalone: true,
  imports: [],
  templateUrl: './card-statistic.component.html',
  styleUrl: './card-statistic.component.css',
})
export class CardStatisticComponent {
  @Input() data!: { title: string; value: number; icon: string };
}
