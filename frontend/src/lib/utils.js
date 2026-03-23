import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge tailwind classes safely.
 * @param {...string} classes 
 * @returns {string}
 */
export function cn(...classes) {
  return twMerge(clsx(classes));
}
