export class NameMatchError extends Error {}

/**
 * Resolves `query` against `items` by name: an exact match (case-sensitive)
 * wins outright; otherwise falls back to a case-insensitive substring match.
 * Zero or multiple matches at either stage is an error, never a guess.
 */
export function matchByName(items, query, getName) {
  const exact = items.filter((item) => getName(item) === query);
  if (exact.length === 1) {
    return exact[0];
  }
  if (exact.length > 1) {
    throw new NameMatchError(`Multiple exact matches for "${query}": ${exact.map(getName).join(', ')}`);
  }

  const lowerQuery = query.toLowerCase();
  const partial = items.filter((item) => getName(item).toLowerCase().includes(lowerQuery));
  if (partial.length === 1) {
    return partial[0];
  }
  if (partial.length === 0) {
    throw new NameMatchError(`No match found for "${query}"`);
  }
  throw new NameMatchError(`Multiple matches for "${query}": ${partial.map(getName).join(', ')}`);
}
