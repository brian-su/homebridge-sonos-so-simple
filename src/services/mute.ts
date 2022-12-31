import { Service, PlatformAccessory, CharacteristicValue, CharacteristicGetCallback, Characteristic } from 'homebridge';
import { SonosPlatform } from '../platform';
import { SonosDeviceManager } from '../helpers/sonosDeviceManager';
import { ServiceNames } from '../models/enums';

export class MuteService {
    private service: Service | undefined;
    private readonly device: SonosDeviceManager;
    private name: string = ServiceNames.MuteService;

    constructor(
        private readonly platform: SonosPlatform,
        private readonly accessory: PlatformAccessory,
        sonosDevice: SonosDeviceManager,
        displayOrder: number
    ) {
        this.device = sonosDevice;

        this.service = this.accessory.getService(this.name) || this.accessory.addService(this.platform.Service.Switch, this.name, this.name);
        this.service.addOptionalCharacteristic(this.platform.Characteristic.ConfiguredName);
        this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName).setValue(this.name);

        this.service.addOptionalCharacteristic(this.platform.Characteristic.ServiceLabelIndex);
        this.service.getCharacteristic(this.platform.Characteristic.ServiceLabelIndex).setValue(displayOrder);

        this.service.getCharacteristic(this.platform.Characteristic.On).onGet(this.handleMuteGet.bind(this)).onSet(this.handleMuteSet.bind(this));
    }

    private async handleMuteGet() {
        var mute = await this.device.getMuted();
        return mute;
    }

    private async handleMuteSet(value: CharacteristicValue) {
        this.device.setMuted(value as boolean);
    }
}
