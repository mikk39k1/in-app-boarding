import type { Flow, FlowStep } from "@ib/db";
import type {
  ElementProfile,
  FlowDTO,
  FlowStepDTO,
  Placement,
} from "@ib/shared";

export function toFlowDTO(
  flow: Flow & { steps: FlowStep[] },
): FlowDTO {
  return {
    id: flow.id,
    projectId: flow.projectId,
    environment: flow.environment,
    name: flow.name,
    description: flow.description,
    isPublished: flow.isPublished,
    createdAt: flow.createdAt.toISOString(),
    updatedAt: flow.updatedAt.toISOString(),
    steps: flow.steps
      .sort((a, b) => a.order - b.order)
      .map<FlowStepDTO>((s) => ({
        id: s.id,
        flowId: s.flowId,
        order: s.order,
        title: s.title,
        body: s.body,
        targetProfile: s.targetProfile as unknown as ElementProfile,
        placement: s.placement as Placement,
        pageUrlPattern: s.pageUrlPattern,
      })),
  };
}
