import { Type } from "class-transformer";
import { IsEmail, IsNotEmpty, ValidateNested } from "class-validator";
import { describe, expect, it } from "vitest";
import { createAppValidationPipe } from "../src/common/pipes/app-validation.pipe";
import { ValidationError } from "../src/common/errors/app-error";

class SignUpDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  name!: string;
}

class InviteDto {
  @ValidateNested()
  @Type(() => SignUpDto)
  person!: SignUpDto;
}

const metadata = { type: "body" as const, metatype: SignUpDto };

describe("createAppValidationPipe", () => {
  it("passes valid input through, stripping unknown properties", async () => {
    const pipe = createAppValidationPipe();

    const result = await pipe.transform({ email: "a@b.com", name: "A", extra: "drop me" }, metadata);

    expect(result).toEqual({ email: "a@b.com", name: "A" });
  });

  it("throws our ValidationError, with per-field details, on invalid input", async () => {
    const pipe = createAppValidationPipe();

    await expect(pipe.transform({ email: "not-an-email", name: "" }, metadata)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: [
        { property: "email", constraints: expect.objectContaining({ isEmail: expect.any(String) }) },
        { property: "name", constraints: expect.objectContaining({ isNotEmpty: expect.any(String) }) },
      ],
    });
  });

  it("names a failing field inside a nested object by its path", async () => {
    const pipe = createAppValidationPipe();

    await expect(
      pipe.transform({ person: { email: "not-an-email", name: "A" } }, { type: "body", metatype: InviteDto }),
    ).rejects.toMatchObject({
      details: [{ property: "person.email", constraints: expect.objectContaining({ isEmail: expect.any(String) }) }],
    });
  });

  it("throws an instance of our ValidationError class", async () => {
    const pipe = createAppValidationPipe();

    await expect(pipe.transform({ email: "not-an-email", name: "" }, metadata)).rejects.toBeInstanceOf(ValidationError);
  });
});
