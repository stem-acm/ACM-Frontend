export type SortDirection = 'none' | 'ascending' | 'descending';

/** One sort state per list, shared by its desktop header and mobile control. */
export class TableSort {
  key = 'createdAt';
  direction: Exclude<SortDirection, 'none'> = 'descending';

  toggle(key = 'name'): void {
    this.direction =
      this.key === key && this.direction === 'ascending' ? 'descending' : 'ascending';
    this.key = key;
  }

  directionFor(key = 'name'): SortDirection {
    return this.key === key ? this.direction : 'none';
  }
}

interface CreationRecord {
  id?: number;
  registrationNumber?: number | null;
  createdAt?: Date | string | null;
}

/** Match the displayed family-name-first order in member, volunteer and check-in tables. */
export function memberName(
  member?: { firstName?: string; lastName?: string | null } | null,
): string {
  return `${member?.lastName ?? ''} ${member?.firstName ?? ''}`.trim();
}

/** Sort the full filtered list before slicing it into pages; never mutate API or selection objects. */
export function sortTableRows<T>(
  rows: readonly T[],
  sort: TableSort,
  name: (row: T) => string,
  record: (row: T) => CreationRecord = row => row as CreationRecord,
): T[] {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const newest = (a: T, b: T): number => {
    const left = record(a);
    const right = record(b);
    const date = (value: CreationRecord) =>
      value.createdAt ? new Date(value.createdAt).getTime() || 0 : 0;
    // Account lists omit createdAt. Their increasing creation IDs retain newest-first order.
    return (
      date(right) - date(left) ||
      (right.id ?? right.registrationNumber ?? 0) - (left.id ?? left.registrationNumber ?? 0)
    );
  };
  return [...rows].sort((a, b) => {
    if (sort.key === 'createdAt') return newest(a, b);
    const comparison = collator.compare(name(a), name(b));
    return (sort.direction === 'ascending' ? comparison : -comparison) || newest(a, b);
  });
}
