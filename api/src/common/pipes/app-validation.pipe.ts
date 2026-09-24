import { ValidationPipe } from "@nestjs/common";
import type { ValidationError as ClassValidatorError } from "class-validator";
import { ValidationError } from "../errors/app-error";

// A nested object's failures sit in children, not constraints: flattened to
// one entry per failing field, named by its path ("customer.email").
function toDetails(
  errors: ClassValidatorError[],
  parent?: string,
): { property: string; constraints: Record<string, string> }[] {
  return errors.flatMap((error) => {
    const property = parent ? `${parent}.${error.property}` : error.property;
    return [
      ...(error.constraints ? [{ property, constraints: error.constraints }] : []),
      ...toDetails(error.children ?? [], property),
    ];
  });
}

export function createAppValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => new ValidationError("Validation failed", toDetails(errors)),
  });
}
