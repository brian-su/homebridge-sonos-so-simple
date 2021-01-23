import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import { SonosPlatform } from './platform';
import { Sonos } from 'sonos';
import { Volume } from './enums';

export class SonosPlatformAccessory {
    private speechEnhancementService: Service;
    private nightModeService: Service;

    //User optional
    private volumeBulbService: Service | undefined;
    private volumeFanService: Service | undefined;
    private muteService: Service | undefined;

    private sonosDevice: Sonos;

    constructor(private readonly platform: SonosPlatform, private readonly accessory: PlatformAccessory) {
        this.sonosDevice = new Sonos(accessory.context.device.host);

        this.sonosDevice.deviceDescription().then((desc) => {
            // set accessory information
            this.accessory
                .getService(this.platform.Service.AccessoryInformation)!
                .setCharacteristic(this.platform.Characteristic.Manufacturer, desc.manufacturer)
                .setCharacteristic(this.platform.Characteristic.Model, desc.modelName)
                .setCharacteristic(this.platform.Characteristic.SerialNumber, desc.serialNum);
        });

        //Volume Setup
        let currentVolumeService = this.accessory.getService('Volume');
        currentVolumeService ? this.accessory.removeService(currentVolumeService) : null;
        switch (this.platform.config.volume) {
            case Volume.Fan:
                this.platform.log.info('Setting up volume as fan');
                this.volumeFanSetup();
                break;
            case Volume.Lightbulb:
                this.platform.log.info('Setting up volume as bulb');
                this.volumeBulbSetup();
                break;
            case Volume.None:
                this.platform.log.info('Removing volume options');

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

        this.nightModeService =
            this.accessory.getService('Night Mode') || this.accessory.addService(this.platform.Service.Switch, 'Night Mode', 'NightMode');
        this.speechEnhancementService =
            this.accessory.getService('Speech Enhancement') ||
            this.accessory.addService(this.platform.Service.Switch, 'Speech Enhancement', 'Speech');

        this.speechEnhancementService.getCharacteristic(this.platform.Characteristic.On).on('set', this.handleSpeechEnhancementSet.bind(this));
        this.nightModeService.getCharacteristic(this.platform.Characteristic.On).on('set', this.handleNightModeSet.bind(this));

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

            if (data.DialogLevel) {
                this.speechEnhancementService.updateCharacteristic(this.platform.Characteristic.On, data.DialogLevel.val);
            }
            if (data.NightMode) {
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
    handleMuteBFGet(callback: CharacteristicGetCallback) {
        this.platform.log.info('Triggered GET Mute');
        this.sonosDevice.getMuted().then((mute) => {
            callback(null, !mute);
        });
    }

    /**
     * Handle requests to set the "Mute" characteristic
     */
    handleMuteBFSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.platform.log.info('Triggered SET Mute:', !value);
        this.sonosDevice.setMuted(!value);
        callback(null);
    }

    /**
     * Handle requests to get the current value of the "Mute" characteristic
     */
    handleMuteSwitchGet(callback: CharacteristicGetCallback) {
        this.sonosDevice.getMuted().then((mute) => {
            this.platform.log.info(`Triggered GET Mute switch: ${mute}`);
            callback(null, mute);
        });
    }

    /**
     * Handle requests to set the "Mute" characteristic
     */
    handleMuteSwitchSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.platform.log.info('Triggered SET Mute switch:', value);
        this.sonosDevice.setMuted(value);
        callback(null);
    }

    /**
     * Handle requests to get the current value of the "Volume" characteristic
     */
    handleVolumeGet(callback: CharacteristicGetCallback) {
        this.platform.log.info('Triggered GET Volume');

        this.sonosDevice.getVolume().then((volume) => {
            this.platform.log.info(volume);
            callback(null, volume);
        });
    }

    /**
     * Handle requests to set the "Volume" characteristic
     */
    handleVolumeSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.platform.log.info('Triggered SET Volume:', value);
        this.sonosDevice.setVolume(value);
        callback(null);
    }

    /**
     * Handle requests to set the "Speech Enhancement" characteristic
     */
    handleSpeechEnhancementSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.platform.log.debug('Triggered SET Speech Enhancement:', value);
        this.sonosDevice.renderingControlService()._request('SetEQ', { InstanceID: 0, EQType: 'DialogLevel', DesiredValue: value ? '1' : '0' });
        callback(null);
    }

    /**
     * Handle requests to set the "Night Mode" characteristic
     */
    handleNightModeSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.platform.log.debug('Triggered SET Night Mode:', value);
        this.sonosDevice.renderingControlService()._request('SetEQ', { InstanceID: 0, EQType: 'NightMode', DesiredValue: value ? '1' : '0' });
        callback(null);
    }
}
