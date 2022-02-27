## Install Homebridge

This should already be done but incase anything has gone wrong you may need to uninstall and reinstall

To install:

```
sudo npm install -g --unsafe-perm homebridge homebridge-config-ui-x
```

```
sudo hb-service install
```

To uninstall:

```
sudo hb-service uninstall
```

```
sudo npm uninstall -g homebridge homebridge-config-ui-x
```

## Running homebridge locally

Run the 'localDev' npm script:

```
npm run localDev
```

Then add the homebridge to the home app by scanning the QR code.

Once you're finished run

```
sudo hb-service stop
```

Note: If you're adding the homebridge to a 'test' home you make get errors saying it's already been added. You'll need to change the name, username and pin in the config and restart.

## Steps for deploying updates:
