import { CapitalizePipe } from './capitalize.pipe';

describe('CapitalizePipe', () => {
  const pipe = new CapitalizePipe();

  it('returns an empty string for null or undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('uppercases the first character', () => {
    expect(pipe.transform('mahajanga')).toBe('Mahajanga');
  });

  it('lowercases the rest when asked', () => {
    expect(pipe.transform('dEPLOY', true)).toBe('Deploy');
  });
});
