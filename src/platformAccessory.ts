import { PlatformAccessory } from 'homebridge';
import { SonosPlatform } from './platform';
import { Sonos } from 'sonos';
import { DeviceDetails, VolumeOptions } from './constants';
import { SonosDeviceManager } from './helpers/sonosDeviceManager';
import { VolumeControlService } from './services/volumeControls';
import { MuteService } from './services/mute';
import { SpeechEnhancementService } from './services/speechEnhancement';
import { NightModeService } from './services/nightMode';
import { SonosLogger } from './helpers/sonosLogger';

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

        var manager = new SonosDeviceManager(this.sonosDevice, this.logger, deviceDetails);

        let displayOrder = 1;
        if (platform.config.volume !== VolumeOptions.None) new VolumeControlService(platform, accessory, manager, displayOrder++);
        if (platform.config.muteSwitch) new MuteService(platform, accessory, manager, displayOrder++);
        if (deviceDetails.IsSoundBar) new SpeechEnhancementService(platform, accessory, manager, displayOrder++);
        if (deviceDetails.IsSoundBar) new NightModeService(platform, accessory, manager, displayOrder++);
    }
}
