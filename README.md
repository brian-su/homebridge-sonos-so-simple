# Homebridge Sonos So Simple

## What does it do?

If, like me, you've bought a Sonos soundbar (Beam/Arc) and just want to expose a few settings to Homekit to control via Siri then this is the package for you!

This package gives you options to control the volume, mute, speech enhancement and night mode via Homebridge with very little config setup.

## Example Configuration

```
    "platforms": [
        ...
        {
            "muteSwitch": true, //with this to false there will be no mute switch, you will only be able to toggle volume by turning the volume off
            "soundbarsOnly": false, //if you only want to expose your TV soundbar, and not sonos speakers in another room, set this to true
            "roomNameAsName": false, //setting this to false will take the master device name instead; e.g. Beam
            "volume": "fan", //Options here are bulb/fan/none
            "platform": "SonosSoSimplePlatform",
            "volumeControlEndpoints": false //Really only if you want some volume endpoint madness, see section below
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

## Volume Control Endpoints

As of version 0.3.0 the plugin can offer two endpoints to allow you to hook up shortcuts and or buttons to trigger the volume up and down. By default this feature is turned off in the config.

Once the featured is toggled on the plugin will open up a port on the Homebridge server and offer two endpoints (volume-up & volume-down) for each discovered Sonos zone.

Eg:

```
{{HOMEBRIDGE_ADDRESS}}:3000/LivingRoom/Beam/volume-up
{{HOMEBRIDGE_ADDRESS}}:3000/LivingRoom/Beam/volume-down
```

**The actual port it opened & the URIs it generated will be outputted into the logs so have a look and grab yours from there.**

By default the endpoint will increment/decrement the volume in steps of 2 but you can change this by adding a value param to the URL.

Eg:

```
{{HOMEBRIDGE_ADDRESS}}:3000/LivingRoom/Beam/volume-up?value=10
{{HOMEBRIDGE_ADDRESS}}:3000/LivingRoom/Beam/volume-down?value=5
```

You can make the request using any HTTP verb you want. GET/PUT/POST, pick whatever your heart desires. Technically it should be a PUT but I can't be bothered restricting it in case it causes someone a problem.

### Plugin Notes & Caveats:

Homekit doesn't play nicely with speakers. So to get around this you'll be offered the option to treat the volume control as a fan or a lightbulb. The goal being that you can still say 'Hey Siri, set my Beam to 20%' or have a movie scene that cranks the volume up and turns speech enhancement on.
Choosing to treat the volume as a lightbulb will cause the volume to mute if you issue commands to turn all the lights off to Siri.

The port number for the volume endpoints _could_ change when Homebridge is restarted, but I think this is unlikely. Essentially the plugin will try to grab port 3000, but if it can't it will try to grab the next available port.
There is a chance that a previous setup will output a port number but then after restarting Homebridge that port will be taken. So in this case the plugin will grab another port instead.

I could mitigate this by asking users to pick a port for themselves and then have it in the config and handle the error if the port is in use but I think that adds complexity that sort of ruins the name of "sonos-**so-simple**". If the port changing is becoming a problem for you open up a ticket on the issues tab and I'll have a look at it.

Finally, I'm fairly certain that the Volume Endpoints feature is an utterly stupid implementation in this instance, but I came across Avi Millers neat idea and thought it might suit.
So if you have a firmer understanding of Homebridge and know of a better way please open up a ticket in the issues tab and let me know.

## References

Thanks to Avi Miller and his [repo](https://github.com/djelibeybi/homebridge-button-platform) for the idea for implementing the Volume Endpoints feature.
