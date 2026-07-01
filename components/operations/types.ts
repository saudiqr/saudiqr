export type OperationTone =
  | "default"
  | "gold"
  | "green"
  | "blue"
  | "red"
  | "gray"
  | "purple";

export type OperationTab<T extends string = string> = {
  key: T;
  label: string;
  icon?: string;
  count?: number;
};