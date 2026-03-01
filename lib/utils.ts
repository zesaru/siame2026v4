import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function withTrackView(url: string, trackView: boolean): string {
  const [path, rawQuery = ""] = url.split("?")
  const params = new URLSearchParams(rawQuery)
  params.set("trackView", trackView ? "1" : "0")
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export function shouldTrackView(url: string): boolean {
  const parsed = new URL(url, "http://localhost")
  return parsed.searchParams.get("trackView") !== "0"
}
