[![Build and Lint](https://github.com/brian-su/homebridge-sonos-so-simple/actions/workflows/build.yml/badge.svg)](https://github.com/brian-su/homebridge-sonos-so-simple/actions/workflows/build.yml)
[![npm](https://img.shields.io/npm/v/homebridge-sonos-so-simple.svg)](https://www.npmjs.com/package/homebridge-sonos-so-simple)
[![npm](https://img.shields.io/npm/dt/homebridge-sonos-so-simple.svg)](https://www.npmjs.com/package/homebridge-sonos-so-simple)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

# Homebridge Sonos So Simple

## Simple Sonos controls through HomeKit 🔊

Want basic Sonos controls in HomeKit? This plugin gives you volume, mute, speech enhancement and night mode controls without any faff.

## Quick setup

```json
"platforms": [
    {
        "platform": "SonosSoSimplePlatform",
        "muteSwitch": true,           // Set false to remove mute switch
        "soundbarsOnly": false,        // Set true to show only TV soundbars
        "roomNameAsName": false,       // False uses device name (e.g. "Beam") instead of room name
        "volume": "fan",              // Options: bulb/fan/none
        "volumeControlEndpoints": false // Enable REST endpoints for volume control
    }
]
```

## Installation

Either:

1. Search for "homebridge-sonos-so-simple" in Homebridge config UI
2. Or run:

```bash
npm install -g --omit=dev homebridge-sonos-so-simple
```

## REST Control (Optional)

Enable `volumeControlEndpoints` to control your Sonos via HTTP requests:

```
http://YOUR_HOMEBRIDGE:3000/LivingRoom/Beam/volume-up
http://YOUR_HOMEBRIDGE:3000/LivingRoom/Beam/volume-down
http://YOUR_HOMEBRIDGE:3000/LivingRoom/Beam/toggle-mute
http://YOUR_HOMEBRIDGE:3000/LivingRoom/Beam/toggle-night-mode
http://YOUR_HOMEBRIDGE:3000/LivingRoom/Beam/toggle-speech-enhancement
```

Adjust volume steps with `?value=10` parameter, without this default functionality is up/down by 2. Works with any HTTP method (GET/POST/PUT).

## Important notes

- Volume shows as either a fan or light in HomeKit (as HomeKit lacks speaker controls)
- Choose "bulb" with caution - "turn off all lights" will mute your Sonos
- REST endpoints typically use port 3000, but may change if port is busy
    - Please open an issue if the port is continually changing/causing issues.

## Credit

Cheers to Avi Miller for the REST endpoints inspiration!

## Configuration

This plugin is configured through the Homebridge user interface or by editing the config.json file directly.

### Options

- **Separate Switch For Mute**: Creates a separate switch to control mute. (Default: true)
- **Only offer controls for soundbars**: Restricts the plugin to only control Sonos soundbars (Beam, Arc, Playbar, Ray). (Default: false)
- **Use the room name as the device name**: Uses the Sonos room name as the HomeKit device name. (Default: false)
- **Sonos Group Discovery Mode**: Controls how Sonos groups are discovered and presented in HomeKit. (Default: auto)
  - **Auto - Smart Group Detection**: Only shows groups with multiple devices
  - **Individual Devices Only**: Only shows individual Sonos devices, regardless of grouping
  - **Groups Only**: Only shows Sonos groups
  - **Both Individual Devices and Groups**: Shows both individual devices and their groups
- **Format for Group Names**: Controls how group names are displayed. (Default: coordinator_plus)
  - **Coordinator Room with Count**: Shows format like "Living Room (2)"
  - **Group Members**: Shows all members like "Living Room, Kitchen, Office"
  - **Simple Group Name**: Shows a simple format like "Sonos Group Living Room"
- **Volume Options**: Choose how to control volume. (Default: none)
  - **None**: No volume control
  - **Lightbulb**: Use a lightbulb control for volume
  - **Fan**: Use a fan control for volume
- **Offer API endpoints to control your devices**: Creates HTTP endpoints for external control. (Default: false)
- **Preserve volume for each input**: Remembers separate volume levels for different inputs. (Default: false)
