import axios from 'axios';
import { DeviceDetails, XmlDeviceDetailsModel } from './xmlDeviceDetailsModel';
import { ApiDeviceModel } from './apiDeviceModel';

export class DeviceDiscoveryModel {
    device: ApiDeviceModel; //TODO: Betting Naming
    isCoordinator: boolean;

    constructor(device: ApiDeviceModel, isCoordinator: boolean) {
        this.device = device;
        this.isCoordinator = isCoordinator;
    }

    //TODO: Error handling
    async deviceDescription(): Promise<DeviceDetails> {
        var response = await axios.get<XmlDeviceDetailsModel>(`http://${this.device.device.ip}:1400/xml/device_description.xml`);

        return response.data.device;
    }
}
