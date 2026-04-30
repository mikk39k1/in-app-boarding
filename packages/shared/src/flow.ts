import type { ElementProfile } from "./profile";

export type Environment = "DEV" | "PROD";

export type Placement =
  | "auto"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-start"
  | "top-end"
  | "right-start"
  | "right-end"
  | "bottom-start"
  | "bottom-end"
  | "left-start"
  | "left-end";

export interface FlowStepDTO {
  id: string;
  flowId: string;
  order: number;
  title: string;
  body: string;
  targetProfile: ElementProfile;
  placement: Placement;
  pageUrlPattern: string | null;
}

export interface FlowDTO {
  id: string;
  projectId: string;
  environment: Environment;
  name: string;
  description: string | null;
  isPublished: boolean;
  steps: FlowStepDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface FlowsResponseDTO {
  flows: FlowDTO[];
}

export interface UpdateFlowDTO {
  name?: string;
  description?: string | null;
  isPublished?: boolean;
  steps?: Array<Omit<FlowStepDTO, "flowId" | "id"> & { id?: string }>;
}
