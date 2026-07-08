# Deployment Strategy: Integrating Remote Resource Booking into SPOG

**Date:** 2026-07-08
**Context:** Based on the audit of Patent US12587737B2.

---

## 1. Objective and Value Proposition

The patent describes a highly structured method for managing remote sources (Live Shots) by encapsulating them into Object Profiles with strict **Booking** vs. **In Use** hierarchies. 

Integrating these concepts into the **Single Pane of Glass (SPOG)** project will transform it from a simple signal router into a robust, conflict-free resource manager. By adopting lifecycle and booking models, SPOG can securely allocate highly sensitive, bi-directional production resources (like IFBs, Talkback, and Teleprompters) across multiple control rooms without contention.

---

## 2. Current State Analysis: The Missing Reservation Hierarchy

Currently, SPOG operates on a radically open routing model. Through our **Twist** architecture (via MQTT), a Destination (Control Room) subscribes to a Source by simply requesting it. 

### The Problem:
There is **no real distinction between Booking and Usership** in the current implementation.
- **A/V Contention:** If Control Room A routes "Reporter 1" to their switcher, Control Room B can simultaneously route "Reporter 1" to theirs. While harmless for receiving video, this becomes chaotic for bidirectional signals.
- **Comms Conflicts:** If both control rooms simultaneously route communication channels to "Reporter 1", two different directors could talk into the reporter's earpiece (IFB) at the same time, leading to on-air confusion.
- **Resource Locking:** When a show ends, resources often remain actively "twisted" to a control room indefinitely because there is no automated lifecycle or expiration concept to relinquish them back to the facility pool.

---

## 3. Deep Dive: Augmenting SPOG with Booking Flags

To solve these issues, we can augment SPOG's underlying data model (specifically the Twist MQTT payloads and Source/Destination JSON definitions) with a series of structured **Status Flags**. 

These flags will be broadcasted over MQTT and read by the SPOG console to enforce UI constraints and backend routing logic.

### 3.1 The Proposed Flag Architecture

We propose adding the following flags to the `Twist` object state:

1. `bookedBy: string | null`
   - **Purpose:** Identifies the unique Destination (Control Room) that currently has **exclusive reservation** over the remote source. 
   - **Behavior:** If `bookedBy` is populated, only that control room can route bidirectional signals (IFB, Teleprompter, Camera PTZ control).

2. `inUseBy: string[]`
   - **Purpose:** A list of Destination IDs currently receiving the A/V output of the source.
   - **Behavior:** Control rooms listed here are simply monitoring the feed. They can see the video and hear the audio but are visually locked out of communicating back to the source in the SPOG UI.

3. `scheduledUntil: number | null` (Unix Timestamp)
   - **Purpose:** Enforces the "Profile Lifecycle" concept.
   - **Behavior:** Represents the "End Time" of a live shot schedule. When the system clock reaches this time, SPOG automatically broadcasts an MQTT payload nullifying `bookedBy` and `inUseBy`, effectively releasing the resources.

4. `allowSharedComms: boolean`
   - **Purpose:** An override flag.
   - **Behavior:** While the system emphasizes strict reservations, some modern productions use "party lines" (PL) where multiple rooms *need* to talk simultaneously. If `true`, the `bookedBy` restriction on comms is temporarily bypassed.

5. `mappingStandard: string`
   - **Purpose:** Defines the hardware mapping footprint of the source (e.g., `SMPTE-2110`, `NDI`, `SRT`).
   - **Behavior:** Aligns with the patent's "intermediate mapping" claim. If a control room's standard differs from the source's `mappingStandard`, SPOG will automatically deploy a conversion template (e.g., routing the signal through an edge transcoder).

### 3.2 Visualizing Flags in the LCARS Interface

These flags will directly alter the LCARS user interface:
- **Booked by You:** The source pool tile pulses with a specific highlight (e.g., green). All IFB and Camera Control editors are unlocked.
- **Booked by Another (In Use by You):** The source pool tile shows an amber "RESERVED" badge indicating the booking control room (e.g., "BOOKED BY: CR-1"). You can view the feed, but Comms editors are grayed out with a `disabled` attribute.
- **Available:** The source tile appears normal. Clicking "Acquire" updates the `bookedBy` flag to your local console ID.

---

## 4. Deployment Strategy & Phased Rollout

To safely introduce these changes to a live production environment, we will deploy in three phases:

### Phase 1: Data Model & Telemetry (Shadow Mode)
- Update the MQTT schemas and JSON models to include the new flags (`bookedBy`, `inUseBy`, `scheduledUntil`).
- Initially, set `bookedBy` to be passively recorded. When a control room connects to an IFB, it broadcasts its ID, but no enforcement logic is active. This allows us to gather data on how often contentions actually occur.

### Phase 2: Production Schedule Integration
- Connect the booking system directly to the existing Production Schedule (`src/ui/console/schedule.ts`).
- When a live shot is assigned to a show, its `scheduledUntil` flag automatically syncs with the end time (`e`) of the current `Slot` in the schedule.
- The Schedule overlay will display which remote resources are currently booked for the live show alongside the crew roles.

### Phase 3: UI Indication (Soft Launch)
- Update the SPOG `sources/panel.ts` and `destinations.ts` to read the reservation flags.
- Display visual badges in the LCARS interface (e.g., "In Use by CR-2").
- Provide a manual "Release" button in the UI, allowing operators to manually clear the `bookedBy` status when a live shot is complete.

### Phase 3: Hard Enforcement & Automated Lifecycles
- SPOG backend logic will explicitly block Twist requests for IFBs if the requester does not match the `bookedBy` ID.
- Enable the `scheduledUntil` cron-job scheduler. The system will automatically release resources and tear down Twists when the broadcast window expires, strictly following the lifecycle guidelines.
- Implement the "Request Booking" workflow, allowing a secondary control room to ping the current booker to request a transfer of the `bookedBy` status.
