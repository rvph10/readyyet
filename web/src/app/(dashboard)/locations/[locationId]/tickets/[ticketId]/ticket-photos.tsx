"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { addPhoto, deletePhoto } from "./actions";

type Photo = components["schemas"]["TicketPhotoDto"];
type Failure = "tooLarge" | "invalid" | "full" | "rateLimited" | "unexpected" | "deleteFailed";

const MAX_PHOTOS = 5;
// The API's limit (ADR 0026), told here before a long upload is wasted.
const MAX_BYTES = 15 * 1024 * 1024;

interface Props {
  locationId: string;
  ticketId: string;
  photos: Photo[];
  // Its tracking link has expired, the Customer can't see one any more.
  canAdd: boolean;
  // An Employee deletes their own photos, an Owner or Admin any.
  deletableBy: { userId: string; any: boolean };
}

export function TicketPhotos({ locationId, ticketId, photos, canAdd, deletableBy }: Props) {
  const t = useTranslations("ticketDetail");
  const input = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState<Photo | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();

  function chosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared, so choosing the same file again after a failure still fires.
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setFailure("tooLarge");
      return;
    }
    setFailure(null);
    const form = new FormData();
    form.set("file", file);
    startTransition(async () => {
      const result = await orFailure(addPhoto(locationId, ticketId, form));
      if (result.ok) return;
      const failures: Record<string, Failure> = {
        CONFLICT: "full",
        VALIDATION_ERROR: "invalid",
        RATE_LIMITED: "rateLimited",
      };
      setFailure(failures[result.code] ?? "unexpected");
    });
  }

  function remove() {
    const photo = deleting!;
    setFailure(null);
    startTransition(async () => {
      const result = await orFailure(deletePhoto(locationId, ticketId, photo.id));
      setDeleting(null);
      if (!result.ok) setFailure("deleteFailed");
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-title-h6">{t("photos")}</h2>
        {canAdd && photos.length > 0 && photos.length < MAX_PHOTOS && (
          <Button
            variant="secondary"
            size="sm"
            pending={pending && !deleting}
            pendingLabel={t("uploading")}
            disabled={pending}
            onClick={() => input.current!.click()}
            className="shrink-0 whitespace-nowrap"
          >
            <Icon name="camera" className="size-3" />
            {t("addPhoto")}
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t("addPhoto")}
          tabIndex={-1}
          onChange={chosen}
          className="sr-only"
        />
      </div>
      {failure && (
        <div className="mb-4">
          <FormAlert>{t(`photoErrors.${failure}`)}</FormAlert>
        </div>
      )}
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative">
              <button
                type="button"
                onClick={() => setViewing(photo)}
                aria-label={t("viewPhoto", { number: index + 1 })}
                className="block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl bg-subtle"
              >
                {/* A bucket URL that expires, there's nothing to optimise or cache. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="size-full object-cover" />
              </button>
              {(deletableBy.any || photo.uploadedBy === deletableBy.userId) && (
                <button
                  type="button"
                  onClick={() => setDeleting(photo)}
                  aria-label={t("deletePhoto", { number: index + 1 })}
                  className="absolute top-1.5 right-1.5 flex size-9 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface text-ink transition-colors hover:bg-canvas"
                >
                  <Icon name="delete" className="size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : canAdd ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => input.current!.click()}
          className="flex min-h-28 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong text-label-sm transition-colors hover:bg-subtle disabled:cursor-default disabled:opacity-60"
        >
          <Icon name="camera" className="size-4" />
          {pending ? t("uploading") : t("addPhoto")}
        </button>
      ) : (
        <p className="text-p-sm text-muted">{t("noPhotosExpired")}</p>
      )}
      <Dialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={t("photos")}
        variant="image"
        // eslint-disable-next-line @next/next/no-img-element
        media={viewing && <img src={viewing.url} alt="" className="max-h-[80dvh] w-full rounded-2xl object-contain" />}
      />
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title={t("deleteTitle")} variant="destructive">
        <p className="text-p-sm text-muted">{t("deleteBody")}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => setDeleting(null)}>
            {t("keepPhoto")}
          </Button>
          <Button variant="danger" pending={pending} pendingLabel={t("deleting")} onClick={remove}>
            {t("confirmDelete")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
