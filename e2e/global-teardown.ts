import { keepStack, stackIsExternal, stopStack } from './fixtures/stack';

export default function globalTeardown(): void {
  if (!stackIsExternal && !keepStack) stopStack();
}
