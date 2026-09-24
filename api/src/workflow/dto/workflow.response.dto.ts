import { StatusDto } from "../../common/dto/status.response.dto";

export class WorkflowStepDto {
  position!: number;
  status!: StatusDto;
}

export class WorkflowDto {
  id!: string;
  name!: string;
  steps!: WorkflowStepDto[];
}
