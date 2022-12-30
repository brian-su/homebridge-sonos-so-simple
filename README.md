# Homebridge Sonos So Simple

## What does it do?

If, like me, you've bought a Sonos soundbar (Beam/Arc) and just want to expose a few settings to Homekit to control via Siri then this is the package for you!

This package gives you options to control the volume, mute, speech enhancement and night mode via Homebridge with very little config setup.

## Caveats

Homekit doesn't play nicely with speakers. So to get around this you'll be offered the option to treat the volume control as a fan or a lightbulb. The goal being that you can still say 'Hey Siri, set my Beam to 20%' or have a movie scene that cranks the volume up and turns speech enhancement on.

NOTE: Choosing to treat the volume as a lightbulb will cause the volume to mute if you issue commands to turn all the lights off to Siri.

## Example Configuration

```
    "platforms": [
        ...
        {
            "muteSwitch": true, //with this to false there will be no mute switch, you will only be able to toggle volume by turning the volume off
            "soundbarsOnly": false, //if you only want to expose your TV soundbar, and not sonos speakers in another room, set this to true
            "roomNameAsName": false, //setting this to false will take the master device name instead; e.g. Beam
            "volume": "fan", //Options here are bulb/fan/none
            "platform": "SonosSoSimplePlatform"
        }
        ...
    ]
```

## Installation

Either search via the Homebridge config for homebridge-sonos-so-simple

```
npm install homebridge-sonos-so-simple -g
```

Once installed update the config, again using the config ui or using the example config above. Remember to remove the comment (//Options here are bulb/fan/none)
