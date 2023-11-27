import { AxiosRequestConfig } from 'axios';
import https from 'https';

/*
    0.3.0 was the last version to bring breaking changes so needed this to remove and re-add devices with the update
    doesn't need updated all the time unless you need to have the devices removed
*/
export const BREAKING_CHANGE_PACKAGE_VERSION = '0.3.0';

export const PLATFORM_NAME = 'SonosSoSimplePlatform';
export const PLUGIN_NAME = 'homebridge-sonos-so-simple';

export const SOUNDBAR_NAMES = ['BEAM', 'ARC', 'PLAYBAR', 'ARC SL', 'RAY', 'PLAYBASE'];
export const DEFAULT_EXPRESS_PORT = 3000;
export const DEFAULT_VOLUME_CHANGE = 2;

export const SONOS_API_HEADERS: AxiosRequestConfig = {
    headers: { 'X-Sonos-Api-Key': '00000000-0000-0000-0000-000000000000' },
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
};
