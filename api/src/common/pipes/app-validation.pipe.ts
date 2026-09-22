import { ValidationPipe } from "@nestjs/common";
import type { ValidationError as ClassValidatorError } from "class-validator";
import { ValidationError } from "../errors/app-error";

function toDetails(errors: ClassValidatorError[]): unknown {
  return errors.map((error) => ({
    property: error.property,
    constraints: error.constraints,
  }));
}

export function createAppValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => new ValidationError("Validation failed", toDetails(errors)),
  });
}
