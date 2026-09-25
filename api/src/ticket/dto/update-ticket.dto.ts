import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { OptionalNotNull } from "../../common/decorators/optional-not-null.decorator";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from "../../common/text-limits";

export class UpdateTicketDto {
  @OptionalNotNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string;
}
