import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SonosPlatform } from '../platform';
import { PlatformDeviceManager } from '../platformDeviceManager';

export class SpeechEnhancementService {
    private speechEnhancementService: Service;
    private readonly device: PlatformDeviceManager;

    constructor(private readonly platform: SonosPlatform, private readonly accessory: PlatformAccessory, sonosDevice: PlatformDeviceManager) {
        this.device = sonosDevice;

        this.speechEnhancementService =
            this.accessory.getService('Speech Enhancement') ||
            this.accessory.addService(this.platform.Service.Switch, 'Speech Enhancement', 'Speech');

        this.speechEnhancementService.getCharacteristic(this.platform.Characteristic.On).onSet(this.handleSpeechEnhancementSet.bind(this));
    }

    private handleSpeechEnhancementSet(value: CharacteristicValue) {
        this.device.setSpeechEnhancement(value as boolean);
    }

    //TODO: the characteristic value here should probably be boolean (think truthyness is helping)
    public updateCharacteristic(value: number) {
        this.speechEnhancementService.updateCharacteristic(this.platform.Characteristic.On, value);
    }
}
