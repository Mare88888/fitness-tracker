import { parseApiRequestError } from "@/lib/services/api-error";
import { buildUrl, fetchWithSilentRefresh, parseJsonResponse } from "@/lib/services/http-client";
import type { BodyMeasurement, CreateBodyMeasurementInput } from "@/types/body-measurement";

export async function getBodyMeasurements(): Promise<BodyMeasurement[]> {
  const response = await fetchWithSilentRefresh(buildUrl("/body-measurements"), {
    method: "GET",
    cache: "no-store",
  });
  return parseJsonResponse<BodyMeasurement[]>(response);
}

export async function upsertBodyMeasurement(payload: CreateBodyMeasurementInput): Promise<BodyMeasurement> {
  const response = await fetchWithSilentRefresh(buildUrl("/body-measurements"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<BodyMeasurement>(response);
}

export async function deleteBodyMeasurement(id: number): Promise<void> {
  const response = await fetchWithSilentRefresh(buildUrl(`/body-measurements/${id}`), {
    method: "DELETE",
  });
  if (response.status === 204) {
    return;
  }
  if (!response.ok) {
    await parseApiRequestError(response, "Failed to delete measurement.");
  }
}
