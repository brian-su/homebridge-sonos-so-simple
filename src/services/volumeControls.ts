import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { RotationSpeed, Brightness } from 'hap-nodejs/dist/lib/definitions/CharacteristicDefinitions';
import { Fan, Lightbulb } from 'hap-nodejs/dist/lib/definitions/ServiceDefinitions';
import { DeviceEvents, VolumeOptions } from '../constants';
import { SonosPlatform } from '../platform';
import { SonosDeviceManager } from '../helpers/sonosDeviceManager';

export class VolumeControlService {
    private readonly device: SonosDeviceManager;
    private service: Service | undefined;
    private name: string = 'Volume';
    private serviceType: typeof Fan | typeof Lightbulb | undefined;
    private volumeCharacteristic: typeof RotationSpeed | typeof Brightness | undefined;

    constructor(
        private readonly platform: SonosPlatform,
        private readonly accessory: PlatformAccessory,
        sonosDevice: SonosDeviceManager,
        displayOrder: number
    ) {
        this.device = sonosDevice;

        let currentVolumeService = this.accessory.getService(this.name);
        currentVolumeService ? this.accessory.removeService(currentVolumeService) : null;

        switch (this.platform.config.volume) {
            case VolumeOptions.Fan:
                this.serviceType = this.platform.Service.Fan;
                this.volumeCharacteristic = this.platform.Characteristic.RotationSpeed;
                break;
            case VolumeOptions.Lightbulb:
                this.serviceType = this.platform.Service.Lightbulb;
                this.volumeCharacteristic = this.platform.Characteristic.Brightness;
                break;
        }

        this.service = this.accessory.addService(this.serviceType!, this.name, this.name);

        this.service.addOptionalCharacteristic(this.platform.Characteristic.ConfiguredName);
        this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName).setValue(this.name);

        this.service.addOptionalCharacteristic(this.platform.Characteristic.ServiceLabelIndex);
        this.service.getCharacteristic(this.platform.Characteristic.ServiceLabelIndex).setValue(displayOrder);

        this.service.getCharacteristic(this.platform.Characteristic.On).onGet(this.handleMuteGet.bind(this)).onSet(this.handleMuteSet.bind(this));

        this.service.getCharacteristic(this.volumeCharacteristic!).onSet(this.handleVolumeSet.bind(this));

        this.device.on(DeviceEvents.DeviceVolumeUpdate, (volume: number) => {
            this.updateCharacteristic(volume);
        });
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
        this.service!.updateCharacteristic(this.volumeCharacteristic!, volume);
    }
}
