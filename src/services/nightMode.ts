import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SonosPlatform } from '../platform';
import { PlatformDeviceManager } from '../platformDeviceManager';

export class NightModeService {
    private nightModeService: Service;
    private readonly device: PlatformDeviceManager;

    constructor(private readonly platform: SonosPlatform, private readonly accessory: PlatformAccessory, sonosDevice: PlatformDeviceManager) {
        this.device = sonosDevice;

        this.nightModeService =
            this.accessory.getService('Night Mode') || this.accessory.addService(this.platform.Service.Switch, 'Night Mode', 'NightMode');

        this.nightModeService.getCharacteristic(this.platform.Characteristic.On).onSet(this.handleNightModeSet.bind(this));
    }

    private handleNightModeSet(value: CharacteristicValue) {
        this.device.setNightMode(value as boolean);
    }

    //TODO: the characteristic value here should probably be boolean (think truthyness is helping)
    public updateCharacteristic(nightMode: number) {
        this.nightModeService.updateCharacteristic(this.platform.Characteristic.On, nightMode);
    }
}
