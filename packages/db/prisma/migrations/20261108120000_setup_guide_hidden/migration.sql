-- ADR 0117: hiding a shop's setup guide is remembered per User.
ALTER TABLE "membership" ADD COLUMN "setup_guide_hidden_at" TIMESTAMP(3);
