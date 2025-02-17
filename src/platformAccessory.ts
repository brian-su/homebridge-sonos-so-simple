import { PlatformAccessory } from 'homebridge';
import { SonosPlatform } from './platform';
import { Sonos } from 'sonos';
import { SonosDeviceManager } from './helpers/sonosDeviceManager';
import { VolumeControlService } from './services/volumeControls';
import { MuteService } from './services/mute';
import { SpeechEnhancementService } from './services/speechEnhancement';
import { NightModeService } from './services/nightMode';
import { SonosLogger } from './helpers/sonosLogger';
import { ApiControlService } from './services/apiControl';
import { VolumeOptions, ServiceNames } from './models/enums';
import { DeviceDetails, ExpressModel } from './models/models';
import { AudioSwitchService } from './services/audioSwitch';

export class SonosPlatformAccessory {
    private readonly accessory: PlatformAccessory;

    constructor(platform: SonosPlatform, accessory: PlatformAccessory, expressModel: ExpressModel | null) {
        this.accessory = accessory;
        const deviceDetails = accessory.context.device as DeviceDetails;
        const sonosDevice = new Sonos(deviceDetails.Host);
        const logger = new SonosLogger(deviceDetails.ModelName, deviceDetails.RoomName, platform.log);

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
            new VolumeControlService(platform, accessory, logger, manager, displayOrder++);
        } else {
            this.removeOldService(ServiceNames.VolumeService);
        }

        if (platform.config.muteSwitch) {
            new MuteService(platform, accessory, logger, manager, displayOrder++);
        } else {
            this.removeOldService(ServiceNames.MuteService);
        }

        if (deviceDetails.IsSoundBar) {
            new SpeechEnhancementService(platform, accessory, logger, manager, displayOrder++);
        } else {
            this.removeOldService(ServiceNames.SpeechEnhancementService);
        }

        if (deviceDetails.IsSoundBar) {
            new NightModeService(platform, accessory, logger, manager, displayOrder++);
        } else {
            this.removeOldService(ServiceNames.NightModeService);
        }

        if (expressModel) {
            new ApiControlService(expressModel, deviceDetails, manager, logger);

            // These have to be registered after the correct routes
            // 404 handler
            expressModel.app.use((req, res, next) => {
                res.status(404).send({ message: 'The route - ' + req.url + '  was not found.' });
            });

            // 500 handler
            expressModel.app.use((err, req, res, next) => {
                logger.logError(err.stack);
                res.status(500).send({ error: err });
            });
        }

        if (platform.config.preserveVolumeOnInputSwitch) {
            new AudioSwitchService(manager, deviceDetails, logger);
        } else {
            this.removeOldService(ServiceNames.AudioSwitchService);
        }
    }

    private removeOldService(name: string) {
        let oldService = this.accessory.getService(name);
        if (oldService) this.accessory.removeService(oldService);
    }
}
