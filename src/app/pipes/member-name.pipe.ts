import { Pipe, PipeTransform } from '@angular/core';

type NameParts = { firstName?: string | null; lastName?: string | null } | null | undefined;

/** "First Last". A missing part is left out, so a member with no last name shows the first name only. */
export function memberFullName(member: NameParts): string {
  return [member?.firstName, member?.lastName].filter(Boolean).join(' ');
}

/** "LAST First", the order of the tables. A missing part is left out. */
export function memberListName(member: NameParts): string {
  return [member?.lastName?.toUpperCase(), member?.firstName].filter(Boolean).join(' ');
}

/**
 * Formats a member name. The last name is nullable in the API, so templates
 * must not join the two parts themselves.
 */
@Pipe({ name: 'memberName', standalone: true })
export class MemberNamePipe implements PipeTransform {
  transform(member: NameParts, order: 'full' | 'list' = 'full'): string {
    return order === 'list' ? memberListName(member) : memberFullName(member);
  }
}
