import { Component } from '@angular/core';
import { QrScannerComponent } from "../../components/qr-scanner/qr-scanner.component";

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [QrScannerComponent],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.css'
})
export class CheckinComponent {

}
