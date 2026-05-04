export type ProgressPhoto = {
  id: number;
  capturedAt: string;
  imageDataUrl: string;
  note?: string | null;
  reminderDate?: string | null;
};

export type CreateProgressPhotoInput = {
  capturedAt: string;
  imageDataUrl: string;
  note?: string;
  reminderDate?: string;
};
