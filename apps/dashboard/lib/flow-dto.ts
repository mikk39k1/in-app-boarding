import type { Flow, FlowStep } from "@ib/db";
import type {
  ElementProfile,
  FlowDTO,
  FlowStepDTO,
  Placement,
  StepRevealAction,
} from "@ib/shared";

type FlowStepMaybeReveal = FlowStep & {
  revealActions?: unknown;
  dimBackground?: boolean | null;
  advanceOnTargetClick?: boolean | null;
};

type FlowMaybeDim = Flow & {
  dimBackground?: boolean | null;
};

export function toFlowDTO(
  flow: Flow & { steps: FlowStep[] },
): FlowDTO {
  const flowWithDim = flow as FlowMaybeDim;
  return {
    id: flow.id,
    projectId: flow.projectId,
    environment: flow.environment,
    name: flow.name,
    description: flow.description,
    isPublished: flow.isPublished,
    dimBackground: flowWithDim.dimBackground ?? false,
    createdAt: flow.createdAt.toISOString(),
    updatedAt: flow.updatedAt.toISOString(),
    steps: flow.steps
      .sort((a, b) => a.order - b.order)
      .map<FlowStepDTO>((rawStep) => {
        const s = rawStep as FlowStepMaybeReveal;
        return {
          id: s.id,
          flowId: s.flowId,
          order: s.order,
          title: s.title,
          body: s.body,
          targetProfile: s.targetProfile as unknown as ElementProfile,
          revealActions:
            (s.revealActions as StepRevealAction[] | null | undefined) ??
            undefined,
          dimBackground: s.dimBackground ?? undefined,
          advanceOnTargetClick: s.advanceOnTargetClick ?? false,
          placement: s.placement as Placement,
          pageUrlPattern: s.pageUrlPattern,
        };
      }),
  };
}
