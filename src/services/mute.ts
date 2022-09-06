import { Service, PlatformAccessory, CharacteristicValue, CharacteristicGetCallback } from 'homebridge';
import { SonosPlatform } from '../platform';
import { PlatformDeviceManager } from '../platformDeviceManager';

export class MuteService {
    private muteService: Service | undefined;
    private readonly device: PlatformDeviceManager;

    constructor(private readonly platform: SonosPlatform, private readonly accessory: PlatformAccessory, sonosDevice: PlatformDeviceManager) {
        this.device = sonosDevice;

        //Optional Mute Switch, so remove it incase the user has chosen no mute.
        let oldMuteService = this.accessory.getService('Mute');
        oldMuteService ? this.accessory.removeService(oldMuteService) : null;

        if (this.platform.config.muteSwitch) {
            this.muteService = this.accessory.addService(this.platform.Service.Switch, 'Mute', 'Mute');
            this.muteService
                .getCharacteristic(this.platform.Characteristic.On)
                .onGet(this.handleMuteGet.bind(this))
                .onSet(this.handleMuteSet.bind(this));
        }
    }

    private async handleMuteGet() {
        var mute = await this.device.getMuted();
        return mute;
    }

    private async handleMuteSet(value: CharacteristicValue) {
        this.device.setMuted(value as boolean);
    }
}
