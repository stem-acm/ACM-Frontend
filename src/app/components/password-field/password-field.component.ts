import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  inject,
  signal,
} from '@angular/core';
import { ControlContainer } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Put on a password input inside `<app-password-field>`. Switches the input
 * between `type="password"` and `type="text"` without touching its value.
 */
@Directive({
  selector: 'input[appPasswordVisibility]',
  standalone: true,
  exportAs: 'passwordVisibility',
  host: { '[type]': "visible() ? 'text' : 'password'" },
})
export class PasswordVisibilityDirective {
  /** The form that holds the input, so a page can mask only that form's fields. */
  readonly form = inject(ControlContainer, { optional: true });
  readonly visible = signal(false);

  toggle(): void {
    this.visible.update(value => !value);
  }

  hide(): void {
    this.visible.set(false);
  }
}

@Component({
  selector: 'app-password-field',
  standalone: true,
  imports: [NgIcon, TranslateModule],
  viewProviders: [provideIcons({ lucideEye, lucideEyeOff })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content />
    @if (field(); as field) {
      <button
        type="button"
        class="password-toggle"
        [attr.aria-label]="(field.visible() ? 'ux.hidePassword' : 'ux.showPassword') | translate"
        [attr.aria-pressed]="field.visible()"
        (mousedown)="$event.preventDefault()"
        (click)="field.toggle()"
      >
        <ng-icon [name]="field.visible() ? 'lucideEyeOff' : 'lucideEye'" size="16" />
      </button>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    :host ::ng-deep input {
      padding-right: 2.25rem;
    }
    .password-toggle {
      position: absolute;
      top: 50%;
      right: 0.25rem;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 0.375rem;
      color: #60718d;
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    .password-toggle:hover {
      color: #143a7b;
      background: #eaf0fa;
    }
    .password-toggle:focus-visible {
      outline: 2px solid #17469e;
      outline-offset: 1px;
    }
  `,
})
export class PasswordFieldComponent {
  readonly field = contentChild(PasswordVisibilityDirective);
}

export const PasswordFieldImports = [PasswordFieldComponent, PasswordVisibilityDirective] as const;
