export type WeeklyPlan = {
  id: number;
  dayOfWeek: number;
  templateId: number;
  templateName: string;
};

export type WeekDayOption = {
  value: number;
  label: string;
};
