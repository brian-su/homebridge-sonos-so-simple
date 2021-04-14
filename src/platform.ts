import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SonosPlatformAccessory } from './platformAccessory';
import { AsyncDeviceDiscovery } from 'sonos';
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

    private readonly soundbars = ['BEAM', 'ARC', 'PLAYBAR'];
    private foundDevices: string[] = [];
    private devicePromises: Promise<null>[] = [];

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

    discoverDevices() {
        this.log.info('Getting Devices');
        let sonosDevices = new AsyncDeviceDiscovery();

        sonosDevices
            .discoverMultiple()
            .then((devices) => {
                this.log.debug(`Device : ${JSON.stringify(devices)}`);
                devices.forEach((device) => {
                    this.devicePromises.push(this.registerDiscoveredDevices(device));
                });
            })
            .then(() => {
                Promise.all(this.devicePromises).then(() => {
                    this.removeDevicesNotDiscovered();
                });
            });
    }

    registerDiscoveredDevices(device: any): Promise<null> {
        return device.deviceDescription().then((description) => {
            if (this.config.soundbarsOnly) {
                let name = description.displayName.toUpperCase();
                if (!this.soundbars.includes(name)) return;
            }

            const uuid = this.api.hap.uuid.generate(description.MACAddress);
            this.foundDevices.push(uuid);
            this.log.debug(`Found device - UUID is : ${uuid}`);
            const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

            if (existingAccessory) {
                this.log.info(`Adding ${description.displayName} from cache`);
                new SonosPlatformAccessory(this, existingAccessory);
                this.api.updatePlatformAccessories([existingAccessory]);
                return;
            }

            this.log.info(`Adding ${description.displayName} as new device`);
            const accessory = new this.api.platformAccessory(description.displayName, uuid);
            accessory.context.device = device;
            new SonosPlatformAccessory(this, accessory);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        });
    }

    removeDevicesNotDiscovered() {
        this.log.info('Got All Devices');
        this.log.debug(`Sonos found the following: ${JSON.stringify(this.foundDevices)}`);

        const removedAccessories = this.accessories.filter((accessory) => this.foundDevices.indexOf(accessory.UUID) === -1);
        removedAccessories.forEach((accessory) => this.log.info(`Removing ${accessory.context.device.host}`));

        this.log.debug(`Now removing the following ${removedAccessories.map((x) => x.UUID)}`);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, removedAccessories);
    }
}
