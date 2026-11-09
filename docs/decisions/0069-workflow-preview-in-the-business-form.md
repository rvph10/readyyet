# 0069: A Workflow preview in the Business form

Date: 2026-10-05

## Decision

Once a Business type is chosen in step 1 of the Business form, a panel under the choices shows that type's default Workflow with `WorkflowSteps`, vertical, from Received to Completed, without the Cancelled and Rejected that stop a Ticket. It plays as a Ticket going through it: one step every 1.2 seconds, a 2-second pause on Completed, then a fade out, a return to the start while hidden, and a fade back in. Choosing another type fades its Workflow in from the start. A caption says customers follow these steps on their tracking page.

Hovering or focusing the panel pauses it, and with reduced motion it doesn't play, as the sign-in tips do. `WorkflowSteps` fades each change of step, which a Ticket moving on while it's watched also uses.

The steps come from `GET /catalogue/business-types`, which already returns each type's default Workflow.

## Why

The Business type decides the steps a Ticket goes through, but nothing said so while choosing it. Seeing a Ticket move through them shows what the choice does, and what customers will see, in the same steps and colours as the rest of the app.
