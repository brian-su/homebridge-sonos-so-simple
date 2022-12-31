/*
    0.3.0 was the last version to bring breaking changes so needed this to remove and re-add devices with the update
    doesn't need updated all the time unless you need to have the devices removed
*/
export const BREAKING_CHANGE_PACKAGE_VERSION = '0.3.0';

export const PLATFORM_NAME = 'SonosSoSimplePlatform';
export const PLUGIN_NAME = 'homebridge-sonos-so-simple';

export const SOUNDBAR_NAMES = ['BEAM', 'ARC', 'PLAYBAR', 'ARC SL', 'RAY'];

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
    VolumeExpressUri: string;
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

export enum ServiceNames {
    VolumeService = 'Volume',
    MuteService = 'Mute',
    SpeechEnhancementService = 'Speech Enhancement',
    NightModeService = 'Night Mode',
    UpButtonService = 'Up Button',
    DownButtonService = 'Down Button',
}
