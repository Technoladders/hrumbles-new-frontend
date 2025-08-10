import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- ADD THE FOLLOWING FUNCTIONS ---

/**
 * Helper function to check if an item is a non-array object.
 * @param item The item to check.
 * @returns `true` if the item is an object, `false` otherwise.
 */
function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Recursively merges two objects. It intelligently combines properties,
 * overwriting properties in the target with the source, and merging nested objects.
 * This is essential for combining the AI's extracted data with the default form state.
 * @param target The base object.
 * @param source The object with new data to merge in.
 * @returns A new object with the merged properties.
 */
export function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
  const output = { ...target } as T & U;

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const sourceKey = key as keyof U;
      if (isObject(source[sourceKey])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[sourceKey] });
        } else {
          // @ts-ignore
          output[key as keyof T & U] = deepMerge(target[key as keyof T], source[sourceKey]);
        }
      } else {
        Object.assign(output, { [key]: source[sourceKey] });
      }
    });
  }

  return output;
}