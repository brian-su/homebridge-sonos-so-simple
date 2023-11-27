# Change Log

Changes to the repo are noted here:

## 1.0.0 2024...

## 0.5.1 - 2023-11-27

-   Bug fix to the package deployment

## 0.5.0 - 2023-11-27

### Features:

-   Adding support for Playbase as a soundbar.
-   Adds to the volume control endpoints feature to add mute, night mode and speech enhancement toggling via API endpoints, locally from within your network. See the [documentation](https://github.com/brian-su/homebridge-sonos-so-simple#rest-control-endpoints) for more info.

## 0.4.0 - 2023-04-01

### Features:

Adds the ability to remember the volume for each input when you switch. If enabled when you switch inputs the volume will be set to the level you last set. Feature is disabled by default.

## 0.3.0 - 2023-01-02

### Features:

Adds Volume Control increment/decrement via HTTP calls that can be hooked up via shortcuts and or buttons.
Full explanation [here](https://github.com/brian-su/homebridge-sonos-so-simple#volume-control-endpoints)

Minimum Node version supported is now 14 to match Homebridge minimum support.

### Bug Fixes:

Generally better error handling if the plugin can't find any devices for whatever reason.

## 0.2.6 - 2022-12-29

### Bug Fixes:

Adding a configured name and display order in the hope it fixes Homekits insistence on using device name and random service order since iOS/HomeOS16.
You might need to reboot homebridge and open the Home app on another device to get it to pick up the name update from iCloud.

## 0.2.5 - 2022-09-05

### Bug Fixes:

Fixes for 0.2.0

## 0.2.0 - 2022-09-05

### Features:

Adding support for zones and for the Ray soundbar

## 0.1.3 - 2022-02-27

### Features:

Adding support for the ARC SL.
Allowing users to change display names to the room name instead of the device name via config toggle.

## 0.1.2 - 2021-04-14

### Features:

Adding support for the Playbar.

## 0.1.1 - 2021-03-09

### Bug Fixes:

Last update broke already added existing devices.

## 0.1.0 - 2021-03-09

### Features:

Adding the ability to deal with multiple Sonos devices and a switch to only deal with soundbars that can be updated in settings.

## 0.0.4 - 2021-01-23

### Features:

Initial working version with volume control, night mode and speech enhancement for one Sonos Soundbar (Beam/Arc)
