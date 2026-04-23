export type BodyMeasurement = {
  id: number;
  date: string;
  formattedDate?: string;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  leftArm: number | null;
  rightArm: number | null;
};

export type CreateBodyMeasurementInput = {
  date: string;
  weight?: number;
  waist?: number;
  chest?: number;
  leftArm?: number;
  rightArm?: number;
};
