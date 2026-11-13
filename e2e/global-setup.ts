import { startStack, stackIsExternal } from './fixtures/stack';

export default function globalSetup(): void {
  if (!stackIsExternal) startStack();
}
