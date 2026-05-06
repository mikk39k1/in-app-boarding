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

export interface StepRevealAction {
  /**
   * Element to interact with before resolving the step target
   * (for example a tab trigger or accordion trigger).
   */
  triggerProfile: ElementProfile;
  /**
   * Optional guard: if the trigger already has this attribute/value pair,
   * no click is needed.
   */
  ensureAttribute?: {
    name: string;
    value: string;
  };
  /**
   * Optional class-state guard: if any listed class exists on the trigger,
   * no click is needed.
   */
  ensureClassAny?: string[];
  /**
   * Metadata for ranking / debugging reveal plans.
   */
  source?: "aria" | "heuristic" | "manual" | "recorded";
  priority?: number;
}

export interface FlowStepDTO {
  id: string;
  flowId: string;
  order: number;
  title: string;
  body: string;
  targetProfile: ElementProfile;
  revealActions?: StepRevealAction[];
  /**
   * Optional per-step override for background dimming.
   * undefined => inherit flow-level setting.
   */
  dimBackground?: boolean;
  /**
   * If true, clicking the anchored target element automatically advances
   * to the next step (or completes the flow on the last step).
   */
  advanceOnTargetClick?: boolean;
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
  /**
   * Flow-level default: darken background with spotlight around the target.
   */
  dimBackground: boolean;
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
  dimBackground?: boolean;
  steps?: Array<Omit<FlowStepDTO, "flowId" | "id"> & { id?: string }>;
}
