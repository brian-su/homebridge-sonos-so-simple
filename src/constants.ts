/*
    0.2.0 brought breaking changes so needed this to remove and re-add devices with the update
    doesn't need updated all the time unless you need to have the devices removed
*/
export const BREAKING_CHANGE_PACKAGE_VERSION = '0.2.6';

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
