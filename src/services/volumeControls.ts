import { Service, PlatformAccessory, CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue } from 'homebridge';
import { VolumeOptions } from '../constants';
import { SonosPlatform } from '../platform';
import { PlatformDeviceManager } from '../platformDeviceManager';

export class VolumeControlService {
    private readonly device: PlatformDeviceManager;
    private volumeBulbService: Service | undefined;
    private volumeFanService: Service | undefined;

    constructor(private readonly platform: SonosPlatform, private readonly accessory: PlatformAccessory, sonosDevice: PlatformDeviceManager) {
        this.device = sonosDevice;

        let currentVolumeService = this.accessory.getService('Volume');
        currentVolumeService ? this.accessory.removeService(currentVolumeService) : null;
        switch (this.platform.config.volume) {
            case VolumeOptions.Fan:
                this.volumeFanSetup();
                break;
            case VolumeOptions.Lightbulb:
                this.volumeBulbSetup();
                break;
            case VolumeOptions.None:
                break;
        }
    }

    private volumeFanSetup() {
        this.volumeFanService = this.accessory.addService(this.platform.Service.Fan, 'Volume', 'Volume');
        this.volumeFanService
            .getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.handleMuteGet.bind(this))
            .onSet(this.handleMuteSet.bind(this));

        this.volumeFanService.getCharacteristic(this.platform.Characteristic.RotationSpeed).onSet(this.handleVolumeSet.bind(this));
    }

    private volumeBulbSetup() {
        this.volumeBulbService = this.accessory.addService(this.platform.Service.Lightbulb, 'Volume', 'Volume');
        this.volumeBulbService
            .getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.handleMuteGet.bind(this))
            .onSet(this.handleMuteSet.bind(this));

        this.volumeBulbService.getCharacteristic(this.platform.Characteristic.Brightness).onSet(this.handleVolumeSet.bind(this));
    }

    private async handleMuteGet() {
        let mute = await this.device.getMuted();
        return !mute;
    }

    private handleMuteSet(value: CharacteristicValue) {
        this.device.setMuted(!value);
    }

    private handleVolumeSet(value: CharacteristicValue) {
        this.device.setVolume(value as number);
    }

    public updateCharacteristic(volume: number) {
        this.platform.log.debug('Update Volume Triggered');
        if (this.volumeFanService) {
            this.platform.log.debug(`Setting Fan To: ${volume}`);
            this.volumeFanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, volume);
        }
        if (this.volumeBulbService) {
            this.platform.log.debug(`Setting Bulb To: ${volume}`);
            this.volumeBulbService.updateCharacteristic(this.platform.Characteristic.Brightness, volume);
        }
    }
}
