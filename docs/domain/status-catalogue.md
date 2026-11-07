# Status catalogue and default workflows

The full seeded `Status` and `BusinessType` catalogue, and the default `Workflow` for each business type. This is the source of truth for `packages/db/prisma/seed.ts`, if they drift, the seed script is wrong, not this doc.

## Statuses

Every default workflow the seed script creates includes the five system statuses (start, both terminal-positive states, and both terminal-negative states), they're part of every seeded `Workflow`'s steps but omitted from the per-type tables below to keep them readable. **The database doesn't enforce this, the code that writes workflows does.** The seed script places them, and a custom workflow (Pro, `PUT /locations/:locationId/workflow`) only takes operational statuses, the API adds the five in the same positions (ADR 0035).

**System** (present in every workflow):

| Code        | Meaning                                                      |
| ----------- | ------------------------------------------------------------ |
| `RECEIVED`  | Ticket created, item dropped off. Mandatory starting status. |
| `READY`     | Work finished, waiting for the client to collect it.         |
| `COMPLETED` | Client has collected the item.                               |
| `CANCELLED` | Client backed out (e.g. declined a quote).                   |
| `REJECTED`  | Shop determined the job can't be done (e.g. unrepairable).   |

**Operational** (business-specific, composed into each type's default below, or freely by a paid custom workflow):

| Code                   | Meaning                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| `INSPECTING`           | Initial visual check before full diagnosis                            |
| `DIAGNOSING`           | In-depth assessment of the problem                                    |
| `QUOTE_PREPARED`       | Estimate is ready                                                     |
| `AWAITING_APPROVAL`    | Waiting on the client's yes/no                                        |
| `APPROVED`             | Client approved, about to start work                                  |
| `AWAITING_PARTS`       | Generic parts wait                                                    |
| `PARTS_ORDERED`        | Parts ordered, in transit                                             |
| `BACKORDERED`          | Supplier delay                                                        |
| `AWAITING_CLIENT_INFO` | Need something from the client to continue                            |
| `ON_HOLD`              | Generic pause, none of the above                                      |
| `IN_PROGRESS`          | Generic "work is happening", fallback when nothing more specific fits |
| `DISASSEMBLY`          | Taking the item apart                                                 |
| `CLEANING`             | Cleaning stage                                                        |
| `REPAIRING`            | Fixing/mending                                                        |
| `REPLACING_PARTS`      | Installing new parts                                                  |
| `REASSEMBLY`           | Putting back together                                                 |
| `PAINTING`             | Bodywork/refinishing                                                  |
| `POLISHING`            | Finishing touch                                                       |
| `CALIBRATING`          | Calibration step                                                      |
| `SOFTWARE_UPDATE`      | Firmware/software work                                                |
| `ALTERATION`           | Adjusting fit (tailoring)                                             |
| `FITTING`              | Client fitting session (tailoring)                                    |
| `STAIN_TREATMENT`      | Pretreatment (pressing)                                               |
| `TESTING`              | Function test / test drive / power-on check                           |
| `QUALITY_CHECK`        | Final review before marking ready                                     |
| `PACKAGING`            | Final packaging before ready                                          |

31 statuses total (5 system + 26 operational). Every status gets an English and French translation (`StatusTranslation`), codes are the stable machine key, labels are what's actually shown.

## Business types and default workflows

Each business type has exactly one active default `Workflow` (`docs/decisions/0003-per-location-billing-and-workflow-tiers.md`). Deliberately shallow, a paid custom workflow can use any of the 26 operational statuses above; these defaults use only what's actually typical for that trade, to keep the upgrade to a custom workflow meaningfully more capable.

| Code                 | English                | French                  | Default operational steps                     |
| -------------------- | ---------------------- | ----------------------- | --------------------------------------------- |
| `OTHER`              | Other                  | Autre                   | `IN_PROGRESS`                                 |
| `GARAGE`             | Garage                 | Garage                  | `DIAGNOSING` → `REPAIRING`                    |
| `ELECTRONICS_REPAIR` | Electronics repair     | Réparateur électronique | `DIAGNOSING` → `REPAIRING`                    |
| `PRESSING`           | Dry cleaning           | Pressing                | `CLEANING`                                    |
| `LEATHER_GOODS`      | Leather goods repair   | Maroquinerie            | `DIAGNOSING` → `REPAIRING`                    |
| `SHOE_REPAIR`        | Shoe repair            | Cordonnerie             | `REPAIRING`                                   |
| `TAILORING`          | Tailoring              | Couture / retouche      | `FITTING` → `ALTERATION`                      |
| `WATCH_JEWELRY`      | Watch & jewelry repair | Horlogerie / bijouterie | `DIAGNOSING` → `REPAIRING` → `QUALITY_CHECK`  |
| `BICYCLE_REPAIR`     | Bicycle repair         | Vélociste               | `DIAGNOSING` → `REPAIRING`                    |
| `APPLIANCE_REPAIR`   | Appliance repair       | Électroménager          | `DIAGNOSING` → `AWAITING_PARTS` → `REPAIRING` |
| `FRAMING`            | Framing                | Encadrement             | `IN_PROGRESS` → `QUALITY_CHECK`               |

`OTHER` is the catch-all for a shop whose trade isn't in this list yet, its default workflow is intentionally the thinnest one.
