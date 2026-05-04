import type { BodyMeasurement } from "./body-measurement";

export type ProgressPhoto = {
  id: number;
  capturedAt: string;
  imageDataUrl: string;
  note?: string | null;
  reminderDate?: string | null;
  bodyMeasurementId?: number | null;
  linkedMeasurement?: BodyMeasurement | null;
};

export type CreateProgressPhotoInput = {
  capturedAt: string;
  imageDataUrl: string;
  note?: string;
  reminderDate?: string;
  bodyMeasurementId?: number | null;
};
