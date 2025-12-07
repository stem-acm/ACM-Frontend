import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-card-statistic',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './card-statistic.component.html',
  styleUrl: './card-statistic.component.css',
})
export class CardStatisticComponent {
  @Input() data!: { title: string; value: number; icon: string };
}
