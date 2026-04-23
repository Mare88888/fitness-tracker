import { formatDateDDMMYYYY } from "@/lib/date-format";
import { parseApiRequestError } from "@/lib/services/api-error";
import { buildUrl, fetchWithSilentRefresh, parseJsonResponse } from "@/lib/services/http-client";
import type { BodyMeasurement, CreateBodyMeasurementInput } from "@/types/body-measurement";

function mapBodyMeasurementDates(entry: BodyMeasurement): BodyMeasurement {
  return {
    ...entry,
    formattedDate: formatDateDDMMYYYY(entry.date),
  };
}

export async function getBodyMeasurements(): Promise<BodyMeasurement[]> {
  const response = await fetchWithSilentRefresh(buildUrl("/body-measurements"), {
    method: "GET",
    cache: "no-store",
  });
  const entries = await parseJsonResponse<BodyMeasurement[]>(response);
  return entries.map(mapBodyMeasurementDates);
}

export async function upsertBodyMeasurement(payload: CreateBodyMeasurementInput): Promise<BodyMeasurement> {
  const response = await fetchWithSilentRefresh(buildUrl("/body-measurements"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const entry = await parseJsonResponse<BodyMeasurement>(response);
  return mapBodyMeasurementDates(entry);
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
