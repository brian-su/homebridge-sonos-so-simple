import axios, { AxiosRequestConfig } from 'axios';
import { VolumeResponse } from './models/volumeResponse';
import { SONOS_API_HEADERS } from '../models/constants';
import { EventEmitter } from 'stream';
import { EqType } from '../models/enums';

export class Sonos extends EventEmitter {
    private baseUrl: string;
    private endpointType: string;

    constructor(ip: string, isGroup: boolean) {
        super();
        this.endpointType = isGroup ? 'group' : 'player';
        this.baseUrl = `https://${ip}:1443/api/v1`;
    }

    async getVolume(): Promise<number> {
        var url = `${this.baseUrl}/${this.endpointType}s/local/${this.endpointType}Volume`;
        var response = await this.getRequest<VolumeResponse>(url);
        return response.volume;
    }

    async setVolume(volumeNumber: number) {
        var url = `${this.baseUrl}/${this.endpointType}s/local/${this.endpointType}volume/mute`;
        await this.postRequest(url, { volume: volumeNumber });
    }

    async getMute(): Promise<boolean> {
        var url = `${this.baseUrl}/${this.endpointType}s/local/${this.endpointType}volume`;
        var response = await this.getRequest<VolumeResponse>(url);
        return response.muted;
    }

    async setMute(isMuted: boolean) {
        var url = `${this.baseUrl}/${this.endpointType}s/local/${this.endpointType}volume/mute`;
        await this.postRequest(url, { muted: isMuted });
    }

    async getSpeechEnhancementMode(): Promise<boolean> {
        throw new Error('Not implemented');
    }

    async setSpeechEnhancementMode(speechEnhancement: boolean) {
        throw new Error('Not implemented');
    }

    async getNightMode(): Promise<boolean> {
        throw new Error('Not implemented');
    }

    async setNightMode(nightMode: boolean) {
        throw new Error('Not implemented');
    }

    async playAudioClip(steamUrl: string) {
        var url = `${this.baseUrl}/players/deviceId/audioClip`;

        await this.postRequest(url, {
            name: 'Audio Clip',
            appId: 'com.sonossosimple.app',
            streamUrl: steamUrl
        });
    }

    setEq(type: EqType, value: boolean) {
        // this.sonosDevice.renderingControlService()._request('SetEQ', { InstanceID: 0, EQType: type, DesiredValue: value ? '1' : '0' });
        throw new Error('Method not implemented.');
    }

    getEq(type: EqType): Promise<boolean> {
        // var toReturn = await this.sonosDevice.renderingControlService()._request('GetEQ', { InstanceID: 0, EQType: type }) as {'CurrentValue' : string};
        // return toReturn.CurrentValue === '1';
        throw new Error('Method not implemented.');
    }

    async getRequest<T>(url: string): Promise<T> {
        var response = await axios.get<T>(url, SONOS_API_HEADERS);
        return response.data;
    }

    async postRequest<T>(url: string, data: any) {
        await axios.post(url, data, SONOS_API_HEADERS);
    }
}
