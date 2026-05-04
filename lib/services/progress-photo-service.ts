import { parseApiRequestError } from "@/lib/services/api-error";
import { buildUrl, fetchWithSilentRefresh, parseJsonResponse } from "@/lib/services/http-client";
import type {
  CreateProgressPhotoInput,
  PatchProgressPhotoLinkedMeasurementInput,
  ProgressPhoto,
} from "@/types/progress-photo";

export async function getProgressPhotos(): Promise<ProgressPhoto[]> {
  const response = await fetchWithSilentRefresh(buildUrl("/progress-photos"), {
    method: "GET",
    cache: "no-store",
  });
  return parseJsonResponse<ProgressPhoto[]>(response);
}

export async function createProgressPhoto(payload: CreateProgressPhotoInput): Promise<ProgressPhoto> {
  const response = await fetchWithSilentRefresh(buildUrl("/progress-photos"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<ProgressPhoto>(response);
}

export async function patchProgressPhotoLinkedMeasurement(
  id: number,
  payload: PatchProgressPhotoLinkedMeasurementInput,
): Promise<ProgressPhoto> {
  const response = await fetchWithSilentRefresh(buildUrl(`/progress-photos/${id}/linked-measurement`), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<ProgressPhoto>(response);
}

export async function deleteProgressPhoto(id: number): Promise<void> {
  const response = await fetchWithSilentRefresh(buildUrl(`/progress-photos/${id}`), {
    method: "DELETE",
  });
  if (response.status === 204) {
    return;
  }
  if (!response.ok) {
    await parseApiRequestError(response, "Failed to delete progress photo.");
  }
}
