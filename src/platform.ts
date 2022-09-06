import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { DeviceDetails, FoundDevices, PLATFORM_NAME, PLUGIN_NAME } from './constants';
import { SonosPlatformAccessory } from './platformAccessory';
import { AsyncDeviceDiscovery } from 'sonos';
import { Device } from './@types/sonos-types';
import { PACKAGE_VERSION } from './version';
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

    private readonly soundbars = ['BEAM', 'ARC', 'PLAYBAR', 'ARC SL', 'RAY'];
    private foundDevices: FoundDevices[] = [];
    private coordinators: string[] = [];

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

        let sonosDevices: Device[] = await asyncDiscovery.discoverMultiple();

        this.coordinators = (await sonosDevices[0].getAllGroups()).map((x) => x.CoordinatorDevice().host);

        for (let device of sonosDevices) {
            await this.registerDiscoveredDevices(device);
        }

        this.removeDevicesNotDiscovered();
    }

    async registerDiscoveredDevices(device: Device) {
        if (!this.coordinators.includes(device.host)) return;

        let description = await device.deviceDescription();
        let displayNameUpperCase = description.displayName.toUpperCase();
        let IsSoundBar = this.soundbars.includes(displayNameUpperCase);

        if (this.config.soundbarsOnly && !IsSoundBar) return;

        let deviceDisplayName = this.config.roomNameAsName ? description.roomName : description.displayName;

        const uuid = this.api.hap.uuid.generate(`${description.MACAddress}:${PACKAGE_VERSION}`);
        this.foundDevices.push({ uuid: uuid, name: deviceDisplayName });
        this.log.debug(`Found device - UUID is : ${uuid}`);
        const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

        if (existingAccessory) {
            this.log.info(`Adding ${description.roomName} ${description.displayName} from cache`);
            existingAccessory.displayName = deviceDisplayName;
            new SonosPlatformAccessory(this, existingAccessory);
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
        } as DeviceDetails;
        new SonosPlatformAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    removeDevicesNotDiscovered() {
        this.log.info('Got All Devices');
        this.log.debug(`Sonos found the following: ${JSON.stringify(this.foundDevices)}`);

        const removedAccessories = this.accessories.filter((accessory) => {
            return this.foundDevices.map((x) => x.uuid).indexOf(accessory.UUID) === -1;
        });

        removedAccessories.forEach((accessory) => {
            let deviceDetails = accessory.context.device as DeviceDetails;
            this.log.info(`Removing ${deviceDetails.Host}`);
        });

        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, removedAccessories);
    }
}
