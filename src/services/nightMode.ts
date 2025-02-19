import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SonosPlatform } from '../platform';
import { SonosDeviceManager } from '../helpers/sonosDeviceManager';
import { ServiceNames, DeviceEvents } from '../models/enums';
import { SonosLogger } from '../helpers/sonosLogger';

export class NightModeService {
    private service: Service;
    private name: string = ServiceNames.NightModeService;
    private readonly device: SonosDeviceManager;

    constructor(
        private readonly platform: SonosPlatform,
        private readonly accessory: PlatformAccessory,
        private readonly logger: SonosLogger,
        sonosDevice: SonosDeviceManager,
        displayOrder: number
    ) {
        this.device = sonosDevice;
        this.logger = logger;

        this.service = this.accessory.getService(this.name) || this.accessory.addService(this.platform.Service.Switch, this.name, 'NightMode');

        this.service.addOptionalCharacteristic(this.platform.Characteristic.ConfiguredName);

        const currentName = this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName);
        if (currentName.value) {
            this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName).setValue(currentName.value);
        } else {
            this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName).setValue(this.name);
        }

        this.service.addOptionalCharacteristic(this.platform.Characteristic.ServiceLabelIndex);
        this.service.getCharacteristic(this.platform.Characteristic.ServiceLabelIndex).setValue(displayOrder);

        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.handleNightModeSet.bind(this));

        this.device.on(DeviceEvents.NightModeUpdate, (nightMode: number) => {
            this.updateCharacteristic(nightMode);
        });
    }

    private handleNightModeSet(value: CharacteristicValue) {
        try {
            this.device.setNightMode(value as boolean);
        } catch (error) {
            this.logger.logError(`Error setting night mode status: \n\n ${error}`);
        }
    }

    //TODO: the characteristic value here should probably be boolean (think truthyness is helping)
    private updateCharacteristic(nightMode: number) {
        try {
            this.service.updateCharacteristic(this.platform.Characteristic.On, nightMode);
        } catch (error) {
            this.logger.logError(`Error updating night mode status: \n\n ${error}`);
        }
    }
}
