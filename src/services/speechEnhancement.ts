import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SonosPlatform } from '../platform';
import { PlatformDeviceManager } from '../platformDeviceManager';

export class SpeechEnhancementService {
    private service: Service;
    private name: string = 'Speech Enhancement';
    private readonly device: PlatformDeviceManager;

    constructor(
        private readonly platform: SonosPlatform,
        private readonly accessory: PlatformAccessory,
        sonosDevice: PlatformDeviceManager,
        displayOrder: number
    ) {
        this.device = sonosDevice;

        this.service = this.accessory.getService(this.name) || this.accessory.addService(this.platform.Service.Switch, this.name, 'Speech');

        this.service.addOptionalCharacteristic(this.platform.Characteristic.ConfiguredName);
        this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName).setValue(this.name);

        this.service.addOptionalCharacteristic(this.platform.Characteristic.ServiceLabelIndex);
        this.service.getCharacteristic(this.platform.Characteristic.ServiceLabelIndex).setValue(displayOrder);

        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.handleSpeechEnhancementSet.bind(this));
    }

    private handleSpeechEnhancementSet(value: CharacteristicValue) {
        this.device.setSpeechEnhancement(value as boolean);
    }

    //TODO: the characteristic value here should probably be boolean (think truthyness is helping)
    public updateCharacteristic(value: number) {
        this.service.updateCharacteristic(this.platform.Characteristic.On, value);
    }
}
