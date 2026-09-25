import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";

// How long a presigned photo URL works (ADR 0026), created per request.
const PRESIGNED_URL_SECONDS = 15 * 60;

// The Railway Bucket (ADR 0026), S3Mock locally and in CI.
@Injectable()
export class StorageService {
  private readonly bucket = process.env.S3_BUCKET as string;
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
    },
    // S3Mock only answers path-style URLs, a bucket name as a subdomain
    // of localhost doesn't resolve.
    forcePathStyle: true,
    // The SDK's default checksums on every request are an AWS extension
    // S3-compatible stores don't all accept.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async delete(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }
  }

  // null when there's no such object.
  async stream(key: string): Promise<{ body: Readable; contentType?: string } | null> {
    try {
      const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return { body: object.Body as Readable, contentType: object.ContentType };
    } catch (error) {
      if (error instanceof NoSuchKey) {
        return null;
      }
      throw error;
    }
  }

  presignedUrl(key: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: PRESIGNED_URL_SECONDS,
    });
  }

  async *list(): AsyncGenerator<{ key: string; lastModified: Date }> {
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, ContinuationToken: continuationToken }),
      );
      for (const object of page.Contents ?? []) {
        yield { key: object.Key as string, lastModified: object.LastModified as Date };
      }
      continuationToken = page.NextContinuationToken;
    } while (continuationToken);
  }
}
