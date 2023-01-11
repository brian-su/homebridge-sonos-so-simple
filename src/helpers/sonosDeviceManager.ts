import EventEmitter from 'events';
import { Sonos } from 'sonos';
import { DeviceEvents } from '../models/enums';
import { DeviceDetails } from '../models/models';
import { AVTransportEvent } from '../models/sonos-types';
import { SonosLogger } from './sonosLogger';

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
            this.emit(DeviceEvents.AudioSwitched, data as AVTransportEvent);
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
        let mute = await this.sonosDevice.getMuted();
        this.log.logDebug(`Triggered GET Mute switch: ${mute}`);
        return mute;
    }

    public async setMuted(value: boolean) {
        if (value && !this.isSoundbar) {
            this.previousLevel = await this.sonosDevice.getVolume();
            this.log.logDebug(`Setting previous level - ${this.previousLevel}`);
        }

        this.log.logDebug(`Triggered SET Mute switch: ${value}`);
        this.sonosDevice.setMuted(value);

        if (!value && !this.isSoundbar && this.previousLevel !== 0) {
            this.log.logDebug(`Setting volume to previous level - ${this.previousLevel}`);
            this.sonosDevice.setVolume(this.previousLevel);
            this.previousLevel = 0; //reset after use to prevent constantly resetting the volume back to this value
        }
    }

    public getVolume(): number {
        return this.sonosDevice.getVolume();
    }

    public setVolume(value: number) {
        this.sonosDevice.setVolume(value);
    }

    public setSpeechEnhancement(value: boolean) {
        this.log.logDebug(`Triggered SET Speech Enhancement: ${value}`);
        this.sonosDevice.renderingControlService()._request('SetEQ', { InstanceID: 0, EQType: 'DialogLevel', DesiredValue: value ? '1' : '0' });
    }

    public setNightMode(value: boolean) {
        this.log.logDebug(`Triggered SET Night Mode: ${value}`);
        this.sonosDevice.renderingControlService()._request('SetEQ', { InstanceID: 0, EQType: 'NightMode', DesiredValue: value ? '1' : '0' });
    }
}
