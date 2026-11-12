import { Pipe, PipeTransform } from '@angular/core';

/**
 * Uppercases the first character of a string. Returns an empty string for
 * null or undefined, since many member fields are nullable in the API.
 * Pass `true` to lowercase the rest of the string.
 */
@Pipe({ name: 'capitalize', standalone: true })
export class CapitalizePipe implements PipeTransform {
  transform(value: string | null | undefined, lowerRest = false): string {
    if (!value) return '';
    const rest = value.slice(1);
    return value.charAt(0).toUpperCase() + (lowerRest ? rest.toLowerCase() : rest);
  }
}
