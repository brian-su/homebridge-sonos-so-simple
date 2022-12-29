import { Service, PlatformAccessory, CharacteristicValue, CharacteristicGetCallback, Characteristic } from 'homebridge';
import { SonosPlatform } from '../platform';
import { PlatformDeviceManager } from '../platformDeviceManager';

export class MuteService {
    private service: Service | undefined;
    private readonly device: PlatformDeviceManager;
    private name: string = 'Mute';

    constructor(
        private readonly platform: SonosPlatform,
        private readonly accessory: PlatformAccessory,
        sonosDevice: PlatformDeviceManager,
        displayOrder: number
    ) {
        this.device = sonosDevice;

        //Optional Mute Switch, so remove it incase the user has chosen no mute.
        let oldMuteService = this.accessory.getService(this.name);
        oldMuteService ? this.accessory.removeService(oldMuteService) : null;

        if (!this.platform.config.muteSwitch) return;

        this.service = this.accessory.addService(this.platform.Service.Switch, this.name, this.name);

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
