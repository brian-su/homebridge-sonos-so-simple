export const PLATFORM_NAME = 'SonosSoSimplePlatform';

export const PLUGIN_NAME = 'homebridge-sonos-so-simple';

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
};

export enum VolumeOptions {
    None = 'none',
    Lightbulb = 'bulb',
    Fan = 'fan',
}

export enum DeviceEvents {
    DeviceVolumeUpdate = 'DeviceVolumeUpdate',
    SpeechEnhancementUpdate = 'SpeechEnhancementUpdate',
    NightModeUpdate = 'NightModeUpdate',
}
