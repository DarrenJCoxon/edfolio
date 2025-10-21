/**
 * Converts Date objects in an object to ISO strings for JSON comparison
 * This is needed because API responses serialize dates as strings
 */
export function toJsonSerializable<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toJsonSerializable(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = toJsonSerializable(obj[key]);
    }
    return result;
  }

  return obj;
}

/**
 * Compares API response data with mock data, handling Date serialization
 */
export function expectApiResponse(actual: any, expected: any) {
  expect(actual).toEqual(toJsonSerializable(expected));
}