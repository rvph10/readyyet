import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextFunction, Request, Response } from "express";

type Schema = {
  $ref?: string;
  allOf?: Schema[];
  type?: string;
  nullable?: boolean;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  additionalProperties?: Schema | boolean;
  required?: string[];
  items?: Schema;
};

type Spec = {
  paths: Record<
    string,
    Record<string, { responses: Record<string, { content?: Record<string, { schema: Schema }> }> }>
  >;
  components: { schemas: Record<string, Schema> };
};

// Read at every test run, so a stale file fails here too, not only in CI.
const spec = JSON.parse(readFileSync(join(__dirname, "..", "..", "openapi.json"), "utf8")) as Spec;

// Left out of the spec on purpose: Better Auth's routes and Resend's webhook.
const UNDOCUMENTED = [/^\/api\/auth\//, /^\/webhooks\//];

export const contractViolations: string[] = [];

// Checks every JSON response the e2e suite gets against api/openapi.json:
// status documented, no undocumented field, every required field present,
// types and enums as declared. Catches what the compiler can't, a service
// returning more than its DTO declares.
export function checkResponsesAgainstSpec(req: Request, res: Response, next: NextFunction) {
  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    // No matched route: an unknown URL, nothing the spec could describe.
    if (req.route) {
      check(req.method, (req.route as { path: string }).path.replace(/:(\w+)/g, "{$1}"), res.statusCode, body);
    }
    return json(body);
  };
  next();
}

function check(method: string, path: string, status: number, body: unknown) {
  if (UNDOCUMENTED.some((pattern) => pattern.test(path))) {
    return;
  }
  const where = `${method} ${path} ${status}`;
  const response = spec.paths[path]?.[method.toLowerCase()]?.responses[status];
  const schema = response?.content?.["application/json"]?.schema;
  if (!schema) {
    contractViolations.push(`${where}: not documented`);
    return;
  }
  validate(JSON.parse(JSON.stringify(body)), schema, where);
}

function resolve(schema: Schema): Schema {
  if (schema.$ref) {
    return resolve(spec.components.schemas[schema.$ref.split("/").pop()!]);
  }
  // How the Swagger plugin writes a property typed with a named schema.
  if (schema.allOf?.length === 1) {
    const { allOf, ...rest } = schema;
    return { ...resolve(allOf[0]), ...rest };
  }
  return schema;
}

function validate(value: unknown, raw: Schema, at: string) {
  const schema = resolve(raw);
  const fail = (problem: string) => contractViolations.push(`${at}: ${problem}`);

  if (value === null) {
    if (!schema.nullable) fail("null but not nullable");
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    fail(`${JSON.stringify(value)} not in ${JSON.stringify(schema.enum)}`);
    return;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) return fail("not an array");
    value.forEach((item, index) => validate(item, schema.items!, `${at}[${index}]`));
    return;
  }
  if (schema.type === "object") {
    if (typeof value !== "object" || Array.isArray(value)) return fail("not an object");
    const record = value as Record<string, unknown>;
    const properties = schema.properties ?? {};
    for (const key of schema.required ?? []) {
      if (!(key in record)) fail(`missing required ${key}`);
    }
    for (const [key, item] of Object.entries(record)) {
      if (properties[key]) {
        validate(item, properties[key], `${at}.${key}`);
      } else if (typeof schema.additionalProperties === "object") {
        validate(item, schema.additionalProperties, `${at}.${key}`);
      } else if (!schema.additionalProperties) {
        fail(`undocumented field ${key}`);
      }
    }
    return;
  }
  if (schema.type && typeof value !== (schema.type === "integer" ? "number" : schema.type)) {
    fail(`${typeof value}, expected ${schema.type}`);
  }
}
