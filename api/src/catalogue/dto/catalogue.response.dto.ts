import { PublicStatusDto, TranslationDto } from "../../common/dto/status.response.dto";

export class DefaultWorkflowStepDto {
  position!: number;
  status!: PublicStatusDto;
}

export class DefaultWorkflowDto {
  steps!: DefaultWorkflowStepDto[];
}

export class BusinessTypeDto {
  code!: string;
  translations!: TranslationDto[];
  defaultWorkflow!: DefaultWorkflowDto;
}

export class CatalogueStatusDto extends PublicStatusDto {
  // One of the five statuses every workflow is built around (ADR 0007).
  isSystem!: boolean;
}
