import { memberName, sortTableRows, TableSort } from './table-sort';

describe('table sorting', () => {
  const rows = [
    { id: 90, createdAt: '2020-01-01', name: 'Zeta' },
    { id: 2, createdAt: '2026-01-01', name: 'alpha' },
    { id: 3, createdAt: '2023-01-01', name: 'Middle' },
  ];

  it('defaults to creation time, not ID or an entity business date', () => {
    expect(sortTableRows(rows, new TableSort(), row => row.name).map(row => row.id)).toEqual([
      2, 3, 90,
    ]);
    expect(rows.map(row => row.id)).toEqual([90, 2, 3]);
  });

  it('toggles names asc/desc, keeping creation time as a stable tie breaker', () => {
    const state = new TableSort();
    expect(state.directionFor()).toBe('none');
    state.toggle();
    expect(state.directionFor()).toBe('ascending');
    expect(sortTableRows(rows, state, row => row.name).map(row => row.id)).toEqual([2, 3, 90]);
    state.toggle();
    expect(state.directionFor()).toBe('descending');
    expect(sortTableRows(rows, state, row => row.name).map(row => row.id)).toEqual([90, 3, 2]);
    state.toggle('actor');
    expect(state.directionFor('actor')).toBe('ascending');
    expect(state.directionFor()).toBe('none');
  });

  it('uses creation IDs for timestamp-less accounts and tied timestamps', () => {
    const accounts = [
      { id: 1, name: 'Z' },
      { id: 9, name: 'A' },
      { id: 4, name: 'M' },
    ];
    expect(sortTableRows(accounts, new TableSort(), row => row.name).map(row => row.id)).toEqual([
      9, 4, 1,
    ]);
    expect(sortTableRows(rows, new TableSort(), () => 'same').map(row => row.id)).toEqual([
      2, 3, 90,
    ]);
  });

  it('sorts the entire list before pagination, with natural case-insensitive names', () => {
    const input = Array.from({ length: 101 }, (_, i) => ({ id: i, name: `Person ${101 - i}` }));
    const state = new TableSort();
    state.toggle();
    const ordered = sortTableRows(input, state, row => row.name);
    expect(ordered[0].name).toBe('Person 1');
    expect(ordered[100].name).toBe('Person 101');
    expect(input[0].name).toBe('Person 101');
  });

  it('matches the family-name-first display and handles missing members', () => {
    expect(memberName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Lovelace Ada');
    expect(memberName(null)).toBe('');
    expect(memberName({ firstName: 'Ada', lastName: null })).toBe('Ada');
  });
});
