import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { BREAKING_CHANGE_PACKAGE_VERSION, PLATFORM_NAME, PLUGIN_NAME, SOUNDBAR_NAMES, DEFAULT_VOLUME_EXPRESS_PORT } from './models/constants';
import { SonosPlatformAccessory } from './platformAccessory';
import { AsyncDeviceDiscovery } from 'sonos';
import { Device } from './models/sonos-types';
import express, { Express } from 'express';
import detect from 'detect-port';
import { FoundDevices, DeviceDetails } from './models/models';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class SonosPlatform implements DynamicPlatformPlugin {
    public readonly Service: typeof Service = this.api.hap.Service;
    public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
    // this is used to track restored cached accessories
    public readonly accessories: PlatformAccessory[] = [];

    private foundDevices: FoundDevices[] = [];
    private coordinators: string[] = [];
    private volumeExpressApp: Express | null = null;
    private volumeExpressPort: number | undefined;

    constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
        this.log.debug('Finished initializing platform:', this.config.name);

        // When this event is fired it means Homebridge has restored all cached accessories from disk.
        // Dynamic Platform plugins should only register new accessories after this event was fired,
        // in order to ensure they weren't added to homebridge already. This event can also be used
        // to start discovery of new accessories.
        this.api.on('didFinishLaunching', () => {
            log.debug('Executed didFinishLaunching callback');
            // run the method to discover / register your devices as accessories
            this.discoverDevices();
        });
    }

    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);

        // add the restored accessory to the accessories cache so we can track if it has already been registered
        this.accessories.push(accessory);
    }

    async discoverDevices() {
        this.log.info('Getting Devices');
        let asyncDiscovery = new AsyncDeviceDiscovery();

        let sonosDevices: Device[];
        try {
            sonosDevices = await asyncDiscovery.discoverMultiple();
        } catch (error: any) {
            this.log.error(error.message);
            return;
        }

        this.coordinators = (await sonosDevices[0].getAllGroups()).map((x) => x.CoordinatorDevice().host);

        if (this.config.volumeControlEndpoints) {
            try {
                this.volumeExpressApp = await this.setupExpressApp();
            } catch (error: any) {
                this.log.error(error.message);
                return;
            }
        }

        for (let device of sonosDevices) {
            await this.registerDiscoveredDevices(device);
        }

        this.removeDevicesNotDiscovered();
    }

    async registerDiscoveredDevices(device: Device) {
        if (!this.coordinators.includes(device.host)) return;

        let description = await device.deviceDescription();
        let displayNameUpperCase = description.displayName.toUpperCase();
        let IsSoundBar = SOUNDBAR_NAMES.includes(displayNameUpperCase);

        if (this.config.soundbarsOnly && !IsSoundBar) return;

        let deviceDisplayName = this.config.roomNameAsName ? description.roomName : description.displayName;

        const uuid = this.api.hap.uuid.generate(`${description.MACAddress}:${BREAKING_CHANGE_PACKAGE_VERSION}`);
        this.foundDevices.push({ uuid: uuid, name: deviceDisplayName });
        this.log.debug(`Found device - UUID is : ${uuid}`);
        const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

        if (existingAccessory) {
            this.log.info(`Adding ${description.roomName} ${description.displayName} from cache`);
            existingAccessory.displayName = deviceDisplayName;
            new SonosPlatformAccessory(this, existingAccessory, this.volumeExpressApp);
            this.api.updatePlatformAccessories([existingAccessory]);
            return;
        }

        this.log.info(`Adding ${description.roomName} ${description.displayName} as new device`);
        const accessory = new this.api.platformAccessory(deviceDisplayName, uuid);
        accessory.context.device = {
            Host: device.host,
            IsSoundBar: IsSoundBar,
            Manufacturer: description.manufacturer,
            SerialNumber: description.serialNum,
            ModelName: description.modelName,
            FirmwareVersion: description.softwareVersion,
            RoomName: description.roomName,
            DisplayName: description.displayName,
            VolumeExpressPort: this.volumeExpressPort,
        } as DeviceDetails;
        new SonosPlatformAccessory(this, accessory, this.volumeExpressApp);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    removeDevicesNotDiscovered() {
        this.log.info('Got All Devices');
        this.log.debug(`Sonos found the following: ${JSON.stringify(this.foundDevices)}`);

        const removedAccessories = this.accessories.filter((accessory) => {
            return this.foundDevices.map((x) => x.uuid).indexOf(accessory.UUID) === -1;
        });

        if (removedAccessories.length > 0) this.log.info('Now removing devices registered with homebridge but not discovered from Sonos');

        removedAccessories.forEach((accessory) => {
            let deviceDetails = accessory.context.device as DeviceDetails;
            this.log.info(`Removing ${deviceDetails.ModelName} ${deviceDetails.Host}`);
        });

        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, removedAccessories);
    }

    async setupExpressApp(): Promise<Express> {
        this.log.info('Server Setting up');
        var targetPort = DEFAULT_VOLUME_EXPRESS_PORT;
        var actualPort = 0;
        var loopCount = 0;

        //Loop to find an available port.
        while (targetPort !== actualPort) {
            if (loopCount > 100) throw Error('Volume Endpoints unavailable: Tried 100 ports, got nada, gave up. Sorry.');

            var portReturn = await detect(targetPort);
            targetPort === portReturn ? (actualPort = portReturn) : (targetPort = portReturn);
            this.log.debug(`Target: ${targetPort}, Actual: ${actualPort}`);

            loopCount++;
        }

        var app = express();
        app.listen(actualPort, () => {
            this.log.info(`Volume endpoints are now listening on port ${actualPort}`);
        });

        this.volumeExpressPort = actualPort;

        return app;
    }
}
