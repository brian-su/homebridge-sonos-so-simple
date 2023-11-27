import EventEmitter from 'events';
import { DeviceEvents, EqType } from '../models/enums';
import { DeviceDetails } from '../models/models';
import { SonosLogger } from './sonosLogger';
import { Sonos } from '../sonos/sonos';

export class SonosDeviceManager extends EventEmitter {
    private sonosDevice: Sonos;
    private log: SonosLogger;

    private isSoundbar: boolean;
    private previousLevel: number = 0;

    constructor(device: Sonos, log: SonosLogger, deviceDetails: DeviceDetails) {
        super();

        this.isSoundbar = deviceDetails.IsSoundBar;
        this.sonosDevice = device;
        this.log = log;

        this.sonosDevice.on('AVTransport', (data) => {
            this.emit(DeviceEvents.AudioSwitched, data as any);
        });

        this.sonosDevice.on('RenderingControl', (data) => {
            if (data.Volume) {
                var master = data.Volume.find((x) => x.channel === 'Master');
                this.log.logDebug(`VOLUME EVENT ${master.val}`);
                this.emit(DeviceEvents.DeviceVolumeUpdate, master.val as number);
            }

            if (data.DialogLevel) {
                this.log.logDebug('SPEECH EVENT');
                this.emit(DeviceEvents.SpeechEnhancementUpdate, data.DialogLevel.val as number);
            }
            if (data.NightMode) {
                this.log.logDebug('NIGHT EVENT');
                this.emit(DeviceEvents.NightModeUpdate, data.NightMode.val as number);
            }
        });
    }

    public async volumeUp(increment: number) {
        this.log.logDebug(`Triggered VolumeUp - ${increment}`);
        var current = await this.sonosDevice.getVolume();

        var newVolume = current + increment;
        if (newVolume > 100) newVolume = 100;

        this.sonosDevice.setVolume(newVolume);
    }

    public async volumeDown(decrement: number) {
        this.log.logDebug(`Triggered VolumeDown - ${decrement}`);
        var current = await this.sonosDevice.getVolume();

        var newVolume = current - decrement;
        if (newVolume < 0) newVolume = 0;

        this.sonosDevice.setVolume(newVolume);
    }

    public async getMuted(): Promise<boolean> {
        let mute = await this.sonosDevice.getMute();
        this.log.logDebug(`Triggered GET Mute switch: ${mute}`);
        return mute;
    }

    public async setMuted(value: boolean) {
        if (value && !this.isSoundbar) {
            this.previousLevel = await this.sonosDevice.getVolume();
            this.log.logDebug(`Setting previous level - ${this.previousLevel}`);
        }

        this.log.logDebug(`Triggered SET Mute switch: ${value}`);
        this.sonosDevice.setMute(value);

        if (!value && !this.isSoundbar && this.previousLevel !== 0) {
            this.log.logDebug(`Setting volume to previous level - ${this.previousLevel}`);
            this.sonosDevice.setVolume(this.previousLevel);
            this.previousLevel = 0; //reset after use to prevent constantly resetting the volume back to this value
        }
    }

    public async getVolume(): Promise<number> {
        return await this.sonosDevice.getVolume();
    }

    public setVolume(value: number) {
        this.sonosDevice.setVolume(value);
    }

    public setSpeechEnhancement(value: boolean) {
        this.log.logDebug(`Triggered SET Speech Enhancement: ${value}`);
        this.sonosDevice.setEq(EqType.DialogLevel, value);
    }

    public async getSpeechEnhancement(): Promise<boolean> {
        var response = await this.sonosDevice.getEq(EqType.DialogLevel);

        this.log.logDebug(`Triggered GET Speech Enhancement: ${response}`);
        return response;
    }

    public setNightMode(value: boolean) {
        this.log.logDebug(`Triggered SET Night Mode: ${value}`);
        this.sonosDevice.setEq(EqType.NightMode, value);
    }

    public async getNightMode(): Promise<boolean> {
        var response = await this.sonosDevice.getEq(EqType.NightMode);

        this.log.logDebug(`Triggered GET Night Mode: ${response}`);
        return response;
    }

    public async playAudioClip(streamUrl: string) {
        await this.sonosDevice.playAudioClip(streamUrl);
    }
}
