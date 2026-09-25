import { ValidateIf } from "class-validator";

// For a field that may be left out but not set to null: IsOptional skips
// null too, which would reach a NOT NULL column and fail there as a 500.
export const OptionalNotNull = () => ValidateIf((_, value) => value !== undefined);
