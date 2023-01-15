export type FoundDevices = {
    uuid: string;
    name: string;
};

export type DeviceDetails = {
    Host: string;
    IsSoundBar: boolean;
    Manufacturer: string;
    ModelName: string;
    SerialNumber: string;
    FirmwareVersion: string;
    RoomName: string;
    DisplayName: string;
    ExpressAppPort: number;
};

export type AudioInputModel = {
    InputUri: string;
    Volume: number;
};
