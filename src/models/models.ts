import { ApiDeviceModel } from '../sonos/models/apiDeviceModel';

export type FoundDevices = {
    uuid: string;
    name: string;
};

export type DeviceDetails = {
    UUID: string;
    Host: string;
    IsSoundBar: boolean;
    Manufacturer: string;
    ModelName: string;
    SerialNumber: string;
    FirmwareVersion: string;
    RoomName: string;
    DisplayName: string;
    ExpressAppPort: number;
    AudioInputVolumes: AudioInputModel[];
    ApiDeviceDetails: ApiDeviceModel;
    UpdateAudioVolumes: (uuid: string, currentSettings: AudioInputModel, currentSavedSettings: AudioInputModel[]) => void;
};

export type AudioInputModel = {
    InputUri: string;
    Volume: number;
};

export interface AVTransportEvent {
    CurrentTrackMetaDataParsed: any;
}
