/**
 * Context Detection
 * Detects current context for slash commands
 */

import { CommandContext } from './types';

export function detectContext(): CommandContext {
  // Edfolio only uses document context
  return CommandContext.DOCUMENT;
}
