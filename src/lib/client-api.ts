export class ApiError extends Error {}

export async function saveItem(id: string | null, payload: unknown): Promise<{ id: string }> {
  const response = await fetch(id ? `/api/items/${id}` : "/api/items", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!response.ok) throw new ApiError(data.error || "Save failed.");
  if (!data.id) throw new ApiError("The server did not return an item.");
  return { id: data.id };
}

export async function removeItem(id: string): Promise<void> {
  const response = await fetch(`/api/items/${id}`, { method: "DELETE" });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(data.error || "Could not archive this item.");
}

export async function saveAgenda(id: string, payload: unknown): Promise<void> {
  const response = await fetch(`/api/agenda/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(data.error || "Could not update the session.");
}

export async function saveTask(id: string, payload: unknown): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(data.error || "Could not update the task.");
}

export async function saveReview(payload: unknown): Promise<void> {
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(data.error || "Could not save the review.");
}
