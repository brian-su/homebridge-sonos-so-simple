import { PlatformAccessory } from 'homebridge';
import { SonosPlatform } from './platform';
import { Sonos } from 'sonos';
import { DeviceDetails, ServiceNames, VolumeOptions } from './constants';
import { SonosDeviceManager } from './helpers/sonosDeviceManager';
import { VolumeControlService } from './services/volumeControls';
import { MuteService } from './services/mute';
import { SpeechEnhancementService } from './services/speechEnhancement';
import { NightModeService } from './services/nightMode';
import { SonosLogger } from './helpers/sonosLogger';
import { Express } from 'express';
import { VolumeEndpointsService } from './services/volumeEndpoints';

export class SonosPlatformAccessory {
    private readonly accessory: PlatformAccessory;

    constructor(platform: SonosPlatform, accessory: PlatformAccessory, volumeExpressApp: Express | null) {
        this.accessory = accessory;
        const deviceDetails = accessory.context.device as DeviceDetails;
        const sonosDevice = new Sonos(deviceDetails.Host);
        const logger = new SonosLogger(deviceDetails.ModelName, platform.log);

        // set accessory information
        accessory
            .getService(platform.Service.AccessoryInformation)!
            .setCharacteristic(platform.Characteristic.Manufacturer, deviceDetails.Manufacturer)
            .setCharacteristic(platform.Characteristic.Model, deviceDetails.ModelName)
            .setCharacteristic(platform.Characteristic.SerialNumber, deviceDetails.SerialNumber)
            .setCharacteristic(platform.Characteristic.FirmwareRevision, deviceDetails.FirmwareVersion);

        var manager = new SonosDeviceManager(sonosDevice, logger, deviceDetails);

        let displayOrder = 1;

        if (platform.config.volume !== VolumeOptions.None) {
            new VolumeControlService(platform, accessory, manager, displayOrder++);
        } else {
            this.removeOldService(ServiceNames.VolumeService);
        }

        if (platform.config.muteSwitch) {
            new MuteService(platform, accessory, manager, displayOrder++);
        } else {
            this.removeOldService(ServiceNames.MuteService);
        }

        if (deviceDetails.IsSoundBar) {
            new SpeechEnhancementService(platform, accessory, manager, displayOrder++);
        } else {
            this.removeOldService(ServiceNames.SpeechEnhancementService);
        }

        if (deviceDetails.IsSoundBar) {
            new NightModeService(platform, accessory, manager, displayOrder++);
        } else {
            this.removeOldService(ServiceNames.NightModeService);
        }

        if (volumeExpressApp) {
            new VolumeEndpointsService(volumeExpressApp, deviceDetails, manager, logger);
        }
    }

    private removeOldService(name: string) {
        let oldService = this.accessory.getService(name);
        if (oldService) this.accessory.removeService(oldService);
    }
}
