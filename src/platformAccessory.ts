import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import { SonosPlatform } from './platform';
import { Sonos } from 'sonos';
import { DeviceDetails, VolumeOptions } from './constants';
import { SonosLogger } from './SonosLogger';

export class SonosPlatformAccessory {
    private speechEnhancementService: Service | undefined;
    private nightModeService: Service | undefined;

    //User optional
    private volumeBulbService: Service | undefined;
    private volumeFanService: Service | undefined;
    private muteService: Service | undefined;

    private sonosDevice: Sonos;
    private isSoundbar: boolean;
    private previousLevel: number = 0;
    private logger: SonosLogger;

    constructor(private readonly platform: SonosPlatform, private readonly accessory: PlatformAccessory) {
        let deviceDetails = accessory.context.device as DeviceDetails;
        this.isSoundbar = deviceDetails.IsSoundBar;
        this.sonosDevice = new Sonos(deviceDetails.Host);
        this.logger = new SonosLogger(deviceDetails.ModelName, this.platform.log);

        this.logger.logError(`Soundbar: ${this.isSoundbar}`);

        // set accessory information
        this.accessory
            .getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, deviceDetails.Manufacturer)
            .setCharacteristic(this.platform.Characteristic.Model, deviceDetails.ModelName)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, deviceDetails.SerialNumber);

        //Volume Setup
        let currentVolumeService = this.accessory.getService('Volume');
        currentVolumeService ? this.accessory.removeService(currentVolumeService) : null;
        switch (this.platform.config.volume) {
            case VolumeOptions.Fan:
                this.logger.logInfo('Setting up volume as fan');
                this.volumeFanSetup();
                break;
            case VolumeOptions.Lightbulb:
                this.logger.logInfo('Setting up volume as bulb');
                this.volumeBulbSetup();
                break;
            case VolumeOptions.None:
                this.logger.logInfo('No Volume Options Chosen');
                break;
        }

        //Optional Mute Switch
        let oldMuteService = this.accessory.getService('Mute');
        oldMuteService ? this.accessory.removeService(oldMuteService) : null;
        if (this.platform.config.muteSwitch) {
            this.muteService = this.accessory.addService(this.platform.Service.Switch, 'Mute', 'Mute');
            this.muteService
                .getCharacteristic(this.platform.Characteristic.On)
                .on('get', this.handleMuteSwitchGet.bind(this))
                .on('set', this.handleMuteSwitchSet.bind(this));
        }

        if (deviceDetails.IsSoundBar) {
            this.nightModeService =
                this.accessory.getService('Night Mode') || this.accessory.addService(this.platform.Service.Switch, 'Night Mode', 'NightMode');
            this.speechEnhancementService =
                this.accessory.getService('Speech Enhancement') ||
                this.accessory.addService(this.platform.Service.Switch, 'Speech Enhancement', 'Speech');

            this.speechEnhancementService.getCharacteristic(this.platform.Characteristic.On).on('set', this.handleSpeechEnhancementSet.bind(this));
            this.nightModeService.getCharacteristic(this.platform.Characteristic.On).on('set', this.handleNightModeSet.bind(this));
        }

        this.sonosDevice.on('RenderingControl', (data) => {
            if (data.Volume) {
                var master = data.Volume.find((x) => x.channel === 'Master');
                if (this.volumeFanService) {
                    this.volumeFanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, master.val);
                }
                if (this.volumeBulbService) {
                    this.volumeBulbService.updateCharacteristic(this.platform.Characteristic.Brightness, master.val);
                }
            }

            if (data.DialogLevel && this.speechEnhancementService !== undefined) {
                this.speechEnhancementService.updateCharacteristic(this.platform.Characteristic.On, data.DialogLevel.val);
            }
            if (data.NightMode && this.nightModeService !== undefined) {
                this.nightModeService.updateCharacteristic(this.platform.Characteristic.On, data.NightMode.val);
            }
        });
    }

    private volumeFanSetup() {
        this.volumeFanService = this.accessory.addService(this.platform.Service.Fan, 'Volume', 'Volume');
        this.volumeFanService
            .getCharacteristic(this.platform.Characteristic.On)
            .on('get', this.handleMuteBFGet.bind(this))
            .on('set', this.handleMuteBFSet.bind(this));

        this.volumeFanService.getCharacteristic(this.platform.Characteristic.RotationSpeed).on('set', this.handleVolumeSet.bind(this));
    }

    private volumeBulbSetup() {
        this.volumeBulbService = this.accessory.addService(this.platform.Service.Lightbulb, 'Volume', 'Volume');
        this.volumeBulbService
            .getCharacteristic(this.platform.Characteristic.On)
            .on('get', this.handleMuteBFGet.bind(this))
            .on('set', this.handleMuteBFSet.bind(this));

        this.volumeBulbService.getCharacteristic(this.platform.Characteristic.Brightness).on('set', this.handleVolumeSet.bind(this));
    }

    /**
     * Handle requests to get the current value of the "Mute" characteristic
     */
    async handleMuteBFGet(callback: CharacteristicGetCallback) {
        this.logger.logDebug('Triggered GET Mute');
        let mute = await this.sonosDevice.getMuted();
        callback(null, !mute);
    }

    /**
     * Handle requests to set the "Mute" characteristic
     */
    handleMuteBFSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.logger.logDebug(`Triggered SET Mute: ${!value}`);
        this.sonosDevice.setMuted(!value);
        callback(null);
    }

    /**
     * Handle requests to get the current value of the "Mute" characteristic
     */
    async handleMuteSwitchGet(callback: CharacteristicGetCallback) {
        let mute = await this.sonosDevice.getMuted();
        this.logger.logDebug(`Triggered GET Mute switch: ${mute}`);
        callback(null, mute);
    }

    /**
     * Handle requests to set the "Mute" characteristic
     */
    async handleMuteSwitchSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        if (value && !this.isSoundbar) {
            this.previousLevel = await this.sonosDevice.getVolume();
            this.logger.logError(`${this.previousLevel}`);
        }

        this.logger.logDebug(`Triggered SET Mute switch: ${value}`);
        this.sonosDevice.setMuted(value);

        if (!value && !this.isSoundbar && this.previousLevel !== 0) {
            this.logger.logError(`${this.previousLevel}`);
            this.sonosDevice.setVolume(this.previousLevel);
        }

        callback(null);
    }

    /**
     * Handle requests to get the current value of the "Volume" characteristic
     */
    async handleVolumeGet(callback: CharacteristicGetCallback) {
        this.logger.logDebug('Triggered GET Volume');

        let volume = await this.sonosDevice.getVolume();
        this.logger.logDebug(volume);
        callback(null, volume);
    }

    /**
     * Handle requests to set the "Volume" characteristic
     */
    handleVolumeSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.logger.logDebug(`Triggered SET Volume: ${value}`);
        this.sonosDevice.setVolume(value);
        callback(null);
    }

    /**
     * Handle requests to set the "Speech Enhancement" characteristic
     */
    handleSpeechEnhancementSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.logger.logDebug(`Triggered SET Speech Enhancement: ${value}`);
        this.sonosDevice.renderingControlService()._request('SetEQ', { InstanceID: 0, EQType: 'DialogLevel', DesiredValue: value ? '1' : '0' });
        callback(null);
    }

    /**
     * Handle requests to set the "Night Mode" characteristic
     */
    handleNightModeSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.logger.logDebug(`Triggered SET Night Mode: ${value}`);
        this.sonosDevice.renderingControlService()._request('SetEQ', { InstanceID: 0, EQType: 'NightMode', DesiredValue: value ? '1' : '0' });
        callback(null);
    }
}
