# Audit of Modern Wireless Microphone and IEM Parameters

This document provides a comprehensive in-depth audit of the telemetry, control parameters, and RF management infrastructure available in modern professional wireless audio systems. It also details the necessary components for a unified "single pane of glass" monitoring and control interface.

## 1. Available Parameters in Modern Wireless Systems

Modern digital and high-end analog wireless systems (Shure Axient Digital, Shure PSM1000, Sennheiser Digital 6000/9000, Wisycom) offer extensive telemetry through network protocols (Ethernet, Dante) and proprietary control links.

### 1.1 Wireless Microphones (Transmitter -> Receiver)

#### Identification & Network Parameters
*   **Device Name/ID:** User-assignable name for the transmitter/receiver channel (e.g., "Lead Vox", "Guitar 1").
*   **Model/Band:** Specific hardware model and RF frequency band.
*   **IP Address/MAC:** Network addressing for the receiver unit.

#### RF (Radio Frequency) Parameters
*   **Frequency/Channel/Group:** The exact operating frequency in MHz, along with the coordination group and channel number.
*   **RF Signal Strength (RSSI):** Received Signal Strength Indicator, typically measured in dBm, monitoring the raw power of the incoming RF signal.
*   **Link Quality / SNR (Signal-to-Noise Ratio):** A smart metric that calculates the signal's robustness against the RF noise floor (e.g., Shure's Channel Quality meter).
*   **Antenna Status & Diversity:** 
    *   **Active Antenna:** Indicates which antenna (A or B, or A/B/C/D) is currently being prioritized.
    *   **Diversity Mode:** True Bit Diversity, True Spatial Diversity, etc.
*   **Transmitter RF Power:** The selected transmission power (e.g., 2mW, 10mW, 50mW).
*   **Interference Detection:** Alerts when an unassigned RF signal encroaches on the operating frequency.

#### Audio Parameters
*   **Audio Metering (Input/Output):** Real-time peak and RMS audio levels (dBFS).
*   **Gain/Sensitivity:** Transmitter input gain (remotely controllable in modern systems) and receiver output gain.
*   **Mute Status:** Indicates if the transmitter's audio switch is muted or if the receiver channel is muted.
*   **Capsule Type:** High-end systems can detect the attached microphone capsule via contact pins.

#### Hardware & Power Status
*   **Battery Status:** Intelligent lithium-ion telemetry (exact %, Time Remaining HH:MM, cycle count, temperature).
*   **Lock Status:** Indicates if the physical interface on the transmitter is locked.

### 1.2 In-Ear Monitors (IEMs) (Transmitter -> Bodypack Receiver)

The parameters for IEMs are conceptually reversed, as the receiver is on the talent.

#### Identification & RF Parameters
*   **Device Name:** Name of the mix (e.g., "Drummer Mix").
*   **Transmitter RF Output Power:** Selectable power levels (e.g., 10mW, 50mW, 100mW).
*   **Receiver Squelch Level:** The RF threshold required to unmute the receiver pack.

#### Audio & Mix Parameters
*   **Audio Input Levels:** L/R audio levels feeding into the transmitter.
*   **Transmission Mode:** Stereo, Mono, or Focus/MixMode (user pans between two discrete mono signals).
*   **EQ & Limiter Status:** Settings for high-frequency boost, low cut, and audio limiter status.
*   **L/R Balance/Pan:** The stereo image balance.

### 1.3 Wireless Matrixing & RF Distribution

In large-scale deployments (multi-stage festivals, reality TV, broadcast studios), RF distribution is managed by programmable matrices (e.g., Wisycom MAT288). 

*   **RF Matrix Routing:** The software must see and control the matrix, allowing engineers to route specific antenna zones to specific receiver racks (e.g., 8:1 or 8:4 diversity combining).
*   **Zone Control:** The ability to remotely toggle antenna zones on/off as talent moves through different areas. This dramatically lowers the RF noise floor by eliminating inactive zones.
*   **Active Antenna Telemetry:** Monitoring the DC voltage and current draw of active antennas (boosters) connected to the matrix. A sudden drop in current triggers a "cable cut" or "antenna disconnect" alarm.
*   **Programmable Attenuation/Gain:** Remotely adjusting the gain at the antenna head or the matrix input to balance signal levels from near and far zones.

---

## 2. Advanced RF Management & Coordination

A true comprehensive system goes beyond monitoring; it actively manages the RF environment.

### 2.1 Spectrum Analyzer Windows

A single pane of glass must integrate real-time spectrum analysis to visualize the RF environment.
*   **Sweep Visualizations:** A graphical plot of RF energy (Amplitude in dBm vs. Frequency in MHz) across the hardware's tuning range (e.g., the 470–608 MHz UHF band, or 900 MHz bands).
*   **Data Overlay:** The ability to overlay active coordinated frequencies (as vertical pins/markers) directly on top of the real-time spectrum sweep. This allows visual confirmation that carriers are sitting in clean airspace, away from DTV (Digital TV) channels or LED wall interference.
*   **Peak Hold & Average:** Tools to track intermittent RF spikes over time, capturing transient interference that might otherwise be missed.
*   **Noise Floor Monitoring:** Continuously measuring the baseline RF energy to determine true SNR.

### 2.2 Frequency Coordination Editor

Modern wireless requires rigorous mathematical coordination to avoid Intermodulation Distortion (IMD).
*   **IMD Calculation Engine:** A built-in calculator (akin to IAS or WWB) that computes 3rd and 5th-order intermodulation products. It ensures that when multiple transmitters are active, their overlapping harmonic frequencies do not land on another assigned channel.
*   **Tuning Ranges & Hardware Bandwidth:** The editor must understand the physical hardware limitations of every connected device. It will only assign a frequency to a device if that frequency falls within the device's specific tuning band (e.g., 470-530 MHz).
*   **Exclusion Zones:** The ability to manually block out frequency ranges (e.g., local TV stations, public safety bands).
*   **Backup Pools:** Generating and managing a list of clean, pre-calculated spare frequencies. If an active channel detects interference, the system can instantly deploy a frequency from the backup pool to the receiver and transmitter.

---

## 3. Talent & Hardware Workflow (Belt Pack per Assignment)

Professional software must separate the "Logical Role" from the "Physical Hardware."

*   **Role/Talent Assignment:** An engineer creates a profile for "Lead Actor" or "Guitarist". This profile contains the audio settings, preferred IEM mix mode, and naming conventions.
*   **Hardware Binding:** A specific physical belt pack (identified by MAC address, Serial Number, or IR sync ID) is assigned to that Role. 
*   **Hardware Swapping:** If a belt pack is dropped into a puddle and breaks, the engineer simply changes the hardware assignment in the software to a spare pack. The system immediately pushes the correct frequency (from the assigned tuning range), name, gain, and RF power to the new pack.
*   **Range Validation:** The software verifies that the assigned physical belt pack supports the frequency range mandated by the current coordination plan for that specific role.

---

## 4. "Single Pane of Glass" Recommendations

To avoid overwhelming the engineer, the unified monitoring dashboard should prioritize **exception-based monitoring** alongside deep dive controls.

### 4.1 The Dashboard (High-Level Monitoring)
*   **Global Status Indicator (Traffic Light):** A unified color (Green/Yellow/Red) combining battery life, RF quality, and Audio clipping per channel.
*   **Link Quality (SNR) Meter:** A simple percentage/bar for connection health.
*   **Time-Remaining Battery:** Displayed in `HH:MM`.
*   **Diversity/Antenna Active:** Small LEDs indicating which matrix zone or antenna is currently active.
*   **Mini Spectrum Sparkline:** A miniature spectrum view per channel showing just the immediate bandwidth around the carrier.

### 4.2 The Detail View (Deep Dive & Control)
*   **Spectrum & Coordination Tab:** A large, interactive RF sweep window with drag-and-drop frequency coordination, IMD calculation, and backup pool management.
*   **Matrix Routing Tab:** A cross-point matrix view to toggle antenna zones and monitor booster current.
*   **Transmitter Audio Gain/Sensitivity:** Remote preamp trimming.
*   **Frequency Reassignment (Panic Button):** A single button to deploy a new, clean frequency from the backup pool if interference hits.
*   **Device Identification (Blink/Identify):** A button that flashes the LEDs on the physical hardware to help stagehands locate the correct device.
*   **Hardware Assignment Dropdown:** Quick selection to swap physical belt packs for a talent role.
