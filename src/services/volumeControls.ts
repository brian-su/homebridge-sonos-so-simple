import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { RotationSpeed, Brightness } from 'hap-nodejs/dist/lib/definitions/CharacteristicDefinitions';
import { SonosPlatform } from '../platform';
import { SonosDeviceManager } from '../helpers/sonosDeviceManager';
import { ServiceNames, VolumeOptions, DeviceEvents } from '../models/enums';

export class VolumeControlService {
    private readonly device: SonosDeviceManager;
    private service!: Service;
    private name: string = ServiceNames.VolumeService;
    private volumeCharacteristic!: typeof RotationSpeed | typeof Brightness;

    constructor(
        private readonly platform: SonosPlatform,
        private readonly accessory: PlatformAccessory,
        sonosDevice: SonosDeviceManager,
        displayOrder: number
    ) {
        this.device = sonosDevice;

        //Volume controls could change so check to see if that they haven't
        let currentVolumeService = this.accessory.getService(this.name);
        switch (this.platform.config.volume) {
            case VolumeOptions.Fan:
                this.checkAndSetupFan(currentVolumeService);
                break;
            case VolumeOptions.Lightbulb:
                this.checkAndSetupBulb(currentVolumeService);
                break;
        }

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

    private checkAndSetupFan(currentVolumeService?: Service) {
        this.volumeCharacteristic = this.platform.Characteristic.RotationSpeed;

        if (currentVolumeService && currentVolumeService.testCharacteristic(this.platform.Characteristic.RotationSpeed)) {
            this.service = currentVolumeService;
            return;
        }
        if (currentVolumeService) this.accessory.removeService(currentVolumeService);
        this.service = this.accessory.addService(this.platform.Service.Fan, this.name, this.name);
    }

    private checkAndSetupBulb(currentVolumeService?: Service) {
        this.volumeCharacteristic = this.platform.Characteristic.Brightness;

        if (currentVolumeService && currentVolumeService.testCharacteristic(this.platform.Characteristic.Brightness)) {
            this.service = currentVolumeService;
            return;
        }
        if (currentVolumeService) this.accessory.removeService(currentVolumeService);
        this.service = this.accessory.addService(this.platform.Service.Lightbulb, this.name, this.name);
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

    private updateCharacteristic(volume: number) {
        this.service!.updateCharacteristic(this.volumeCharacteristic!, volume);
    }
}
