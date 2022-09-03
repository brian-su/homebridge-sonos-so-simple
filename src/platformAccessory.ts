import { PlatformAccessory } from 'homebridge';
import { SonosPlatform } from './platform';
import { Sonos } from 'sonos';
import { DeviceDetails, DeviceEvents } from './constants';
import { SonosLogger } from './SonosLogger';
import { PlatformDeviceManager } from './platformDeviceManager';
import { VolumeControlService } from './services/volumeControls';
import { MuteService } from './services/mute';
import { SpeechEnhancementService } from './services/speechEnhancement';
import { NightModeService } from './services/nightMode';

export class SonosPlatformAccessory {
    private sonosDevice: Sonos;
    private logger: SonosLogger;

    constructor(private readonly platform: SonosPlatform, private readonly accessory: PlatformAccessory) {
        let deviceDetails = accessory.context.device as DeviceDetails;
        this.sonosDevice = new Sonos(deviceDetails.Host);
        this.logger = new SonosLogger(deviceDetails.ModelName, this.platform.log);

        // set accessory information
        this.accessory
            .getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, deviceDetails.Manufacturer)
            .setCharacteristic(this.platform.Characteristic.Model, deviceDetails.ModelName)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, deviceDetails.SerialNumber)
            .setCharacteristic(this.platform.Characteristic.FirmwareRevision, deviceDetails.FirmwareVersion);

        var manager = new PlatformDeviceManager(this.sonosDevice, this.logger, deviceDetails);

        const volumeControls = new VolumeControlService(platform, accessory, manager);
        const speechEnhancementService = deviceDetails.IsSoundBar ? new SpeechEnhancementService(platform, accessory, manager) : null;
        const nightModeService = deviceDetails.IsSoundBar ? new NightModeService(platform, accessory, manager) : null;
        new MuteService(platform, accessory, manager);

        manager.on(DeviceEvents.DeviceVolumeUpdate, (volume: number) => {
            volumeControls.updateCharacteristic(volume);
        });
        manager.on(DeviceEvents.SpeechEnhancementUpdate, (speech: number) => {
            speechEnhancementService?.updateCharacteristic(speech);
        });
        manager.on(DeviceEvents.NightModeUpdate, (nightMode: number) => {
            nightModeService?.updateCharacteristic(nightMode);
        });
    }
}
