export function displayInitial(name: string | null | undefined) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}
