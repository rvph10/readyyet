import { StatusDto } from "../../common/dto/status.response.dto";

export class WorkflowStepDto {
  position!: number;
  status!: StatusDto;
}

export class WorkflowDto {
  id!: string;
  name!: string;
  // The Location's own, rather than its trade's default (ADR 0035).
  custom!: boolean;
  steps!: WorkflowStepDto[];
}
