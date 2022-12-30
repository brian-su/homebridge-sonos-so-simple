import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { DeviceEvents } from '../constants';
import { SonosPlatform } from '../platform';
import { SonosDeviceManager } from '../helpers/sonosDeviceManager';

export class NightModeService {
    private service: Service;
    private name: string = 'Night Mode';
    private readonly device: SonosDeviceManager;

    constructor(
        private readonly platform: SonosPlatform,
        private readonly accessory: PlatformAccessory,
        sonosDevice: SonosDeviceManager,
        displayOrder: number
    ) {
        this.device = sonosDevice;

        this.service = this.accessory.getService(this.name) || this.accessory.addService(this.platform.Service.Switch, this.name, 'NightMode');

        this.service.addOptionalCharacteristic(this.platform.Characteristic.ConfiguredName);
        this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName).setValue(this.name);

        this.service.addOptionalCharacteristic(this.platform.Characteristic.ServiceLabelIndex);
        this.service.getCharacteristic(this.platform.Characteristic.ServiceLabelIndex).setValue(displayOrder);

        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.handleNightModeSet.bind(this));

        this.device.on(DeviceEvents.NightModeUpdate, (nightMode: number) => {
            this.updateCharacteristic(nightMode);
        });
    }

    private handleNightModeSet(value: CharacteristicValue) {
        this.device.setNightMode(value as boolean);
    }

    //TODO: the characteristic value here should probably be boolean (think truthyness is helping)
    public updateCharacteristic(nightMode: number) {
        this.service.updateCharacteristic(this.platform.Characteristic.On, nightMode);
    }
}
