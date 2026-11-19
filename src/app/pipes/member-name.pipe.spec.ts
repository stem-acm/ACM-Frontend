import { MemberNamePipe, memberFullName, memberListName } from './member-name.pipe';

describe('MemberNamePipe', () => {
  const pipe = new MemberNamePipe();

  it('joins the first name and the last name', () => {
    expect(pipe.transform({ firstName: 'Hery', lastName: 'Rakoto' })).toBe('Hery Rakoto');
  });

  it('puts the uppercase last name first in the list order', () => {
    expect(pipe.transform({ firstName: 'Hery', lastName: 'Rakoto' }, 'list')).toBe('RAKOTO Hery');
  });

  it('shows only the first name when the last name is null', () => {
    expect(pipe.transform({ firstName: 'Hery', lastName: null })).toBe('Hery');
    expect(pipe.transform({ firstName: 'Hery', lastName: null }, 'list')).toBe('Hery');
  });

  it('returns an empty string for a missing member', () => {
    expect(memberFullName(null)).toBe('');
    expect(memberListName(undefined)).toBe('');
  });
});
